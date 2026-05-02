/**
 * Custom typecheck wrapper that filters diagnostics from auto-generated files.
 *
 * components/ai-elements/ files are read-only (regenerated from prompts) and
 * contain internal TypeScript errors we cannot fix. The tsconfig `exclude`
 * removes most of them, but files pulled in via import resolution still report
 * errors. This script filters those remaining diagnostics so `pnpm typecheck`
 * only surfaces actionable errors in our own code.
 */

import { execSync } from "node:child_process"

const EXCLUDED_PREFIX = "components/ai-elements/"

try {
	execSync("tsc --noEmit", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })
	process.exit(0)
} catch (error) {
	const raw = (error.stdout || "") + (error.stderr || "")
	const lines = raw.split(/\r?\n/)

	const filtered = []
	let skipping = false

	for (const line of lines) {
		// New diagnostic line — starts with a file path
		if (/^\S/.test(line) && line.includes(": error TS")) {
			if (line.startsWith(EXCLUDED_PREFIX)) {
				skipping = true
				continue
			}
			skipping = false
			filtered.push(line)
			continue
		}

		// Continuation of a multi-line diagnostic (indented or blank)
		if (skipping) continue

		filtered.push(line)
	}

	const output = filtered.join("\n").trimEnd()
	const remainingErrors = filtered.filter((l) => /\berror TS\d+/.test(l))

	if (output) process.stderr.write(`${output}\n`)
	process.exit(remainingErrors.length > 0 ? 1 : 0)
}
