#!/usr/bin/env node

/**
 * Advanced Agent Model Manager (No external packages)
 * This script allows you to manage the "model" field in your agent markdown files.
 * You can add, override, or remove models across all agent files in the .github/agents directory.
 * Uses only built-in Node.js modules.
 * Not to be edited by AI to ensure it remains functional and free of unintended changes.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { stdin as input, stdout as output } from "node:process"
import readline from "node:readline/promises"

const AGENTS_DIR = ".github/agents"

const rl = readline.createInterface({ input, output })

async function ask(question) {
	const answer = await rl.question(question)
	return answer.trim()
}

async function choose(message, choices) {
	console.log(`\n${message}`)
	choices.forEach((choice, i) => {
		console.log(`${i + 1}. ${choice}`)
	})
	const index = await ask("\nSelect number: ")
	const selected = choices[Number(index) - 1]
	return selected
}

async function getAgentFiles() {
	await stat(AGENTS_DIR)
	const files = await readdir(AGENTS_DIR)
	return files.filter((f) => f.endsWith(".agent.md"))
}

/**
 * Very simple YAML frontmatter parser
 * Supports:
 * - key: value
 * - key:
 *    - item1
 *    - item2
 */
function parseFrontmatter(content) {
	if (!content.startsWith("---")) return null

	const parts = content.split("---")
	if (parts.length < 3) return null

	const yamlPart = parts[1]
	const body = parts.slice(2).join("---")

	const data = {}
	const lines = yamlPart.split("\n")

	let currentKey = null

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		if (line.startsWith("- ")) {
			if (currentKey) {
				if (!Array.isArray(data[currentKey])) {
					data[currentKey] = []
				}
				data[currentKey].push(line.slice(2).trim())
			}
		} else {
			const [key, ...rest] = line.split(":")
			const value = rest.join(":").trim()

			if (value === "") {
				currentKey = key.trim()
				data[currentKey] = []
			} else {
				data[key.trim()] = value
				currentKey = key.trim()
			}
		}
	}

	return { data, body }
}

function stringifyYAML(data) {
	let result = ""

	for (const key of Object.keys(data)) {
		const value = data[key]

		if (Array.isArray(value)) {
			result += `${key}:\n`
			for (const item of value) {
				result += `  - ${item}\n`
			}
		} else {
			result += `${key}: ${value}\n`
		}
	}

	return result.trim()
}

function buildContent(data, body) {
	const yamlString = stringifyYAML(data)
	return `---\n${yamlString}\n---${body}`
}

async function main() {
	let agentFiles

	try {
		agentFiles = await getAgentFiles()
	} catch {
		console.error("Agents directory not found.")
		process.exit(1)
	}

	if (!agentFiles.length) {
		console.log("No .agent.md files found.")
		process.exit(0)
	}

	console.log(`Found ${agentFiles.length} agent files.`)

	const action = await choose("Select action:", [
		"Add model (merge with existing)",
		"Override model(s)",
		"Remove a specific model",
		"Remove all models",
		"Exit",
	])

	if (action === "Exit") {
		console.log("Goodbye 👋")
		process.exit(0)
	}

	let modelInput = null

	if (action === "Add model (merge with existing)" || action === "Override model(s)") {
		const input = await ask("Enter model name(s) separated by commas: ")

		modelInput = input
			.split(",")
			.map((m) => m.trim())
			.filter(Boolean)
	}

	if (action === "Remove a specific model") {
		modelInput = await ask("Enter the specific model to remove: ")
	}

	let modifiedCount = 0

	for (const file of agentFiles) {
		const filePath = join(AGENTS_DIR, file)
		const content = await readFile(filePath, "utf-8")
		const parsed = parseFrontmatter(content)

		if (!parsed) {
			console.log(`Skip ${file} (no frontmatter)`)
			continue
		}

		const { data, body } = parsed

		if (action === "Add model (merge with existing)") {
			const newModels = modelInput

			if (!data.model) {
				data.model = newModels.length === 1 ? newModels[0] : newModels
			} else {
				const existing = Array.isArray(data.model)
					? new Set(data.model)
					: new Set([data.model])

				for (const m of newModels) {
					existing.add(m)
				}

				data.model = Array.from(existing)
			}
		}

		if (action === "Override model(s)") {
			data.model = modelInput.length === 1 ? modelInput[0] : modelInput
		}

		if (action === "Remove a specific model") {
			if (Array.isArray(data.model)) {
				data.model = data.model.filter((m) => m !== modelInput)
				if (!data.model.length) delete data.model
			} else if (data.model === modelInput) {
				delete data.model
			}
		}

		if (action === "Remove all models") {
			delete data.model
		}

		const updated = buildContent(data, body)
		await writeFile(filePath, updated, "utf-8")

		console.log(`Updated: ${file}`)
		modifiedCount++
	}

	console.log("\nDone.")
	console.log(`Modified files: ${modifiedCount}`)

	rl.close()
}

main().catch((err) => {
	console.error("Fatal:", err)
	process.exit(1)
})
