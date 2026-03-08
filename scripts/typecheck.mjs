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
const DIAGNOSTIC_PATTERN = /\berror TS\d+/

function isDiagnosticStart(line) {
	return /^\S/.test(line) && DIAGNOSTIC_PATTERN.test(line)
}

function shouldExcludeDiagnostic(line) {
	return line.startsWith(EXCLUDED_PREFIX)
}

function filterDiagnostics(raw) {
	const filtered = []
	let skipping = false

	for (const line of raw.split(/\r?\n/)) {
		if (isDiagnosticStart(line)) {
			skipping = shouldExcludeDiagnostic(line)
			if (!skipping) {
				filtered.push(line)
			}
			continue
		}

		if (!skipping) {
			filtered.push(line)
		}
	}

	return filtered
}

try {
	execSync("tsgo --noEmit", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })
	process.exit(0)
} catch (error) {
	const raw = (error.stdout || "") + (error.stderr || "")
	const filtered = filterDiagnostics(raw)
	const output = filtered.join("\n").trimEnd()
	const remainingErrors = filtered.filter((line) => DIAGNOSTIC_PATTERN.test(line))

	if (output) process.stderr.write(`${output}\n`)
	process.exit(remainingErrors.length > 0 ? 1 : 0)
}
