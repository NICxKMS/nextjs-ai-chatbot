#!/usr/bin/env node

/**
 * Import boundary enforcement script.
 * Scans .ts/.tsx files and enforces architectural import rules.
 *
 * Rules:
 *   lib/**          → cannot import from features/**, components/**, app/**
 *   components/**   → cannot import from features/**, app/**
 *   features/**     → cannot import from app/**
 *   features/X/**   → cannot import from features/Y/components/**,
 *                      features/Y/hooks/**, features/Y/actions/**,
 *                      features/Y/lib/** (except allowlist)
 *
 * Usage: node scripts/check-imports.mjs
 * Exit: 0 if clean, 1 if violations found
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

const ROOT = resolve(fileURLDirname(import.meta.url), "..")

/** Portable import.meta.dirname equivalent */
function fileURLDirname(url) {
	return dirname(new URL(url).pathname.replace(/^\/([A-Z]:)/i, "$1"))
}

// ─── Allowlist: explicit cross-feature import exceptions ────────────────────
const ALLOWLIST = new Set([
	"features/chat/components/stream-bridge.tsx -> features/artifacts/lib/artifact-store.ts",
	"features/chat/components/chat-shell.tsx -> features/artifacts/lib/artifact-store.ts",
	"features/chat/components/chat-shell.tsx -> features/artifacts/components/artifact-panel.tsx",
	"features/chat/hooks/use-chat-session.ts -> features/settings/hooks/use-settings.ts",
	"features/chat/components/message.tsx -> features/voting/components/vote-buttons.tsx",
	"features/chat/components/chat-header.tsx -> features/visibility/components/visibility-selector.tsx",
	"features/chat/components/chat-header.tsx -> features/models/components/model-selector.tsx",
	"features/sidebar/components/sidebar-history-item.tsx -> features/chat/actions/delete-chat.ts",
	"features/sidebar/components/sidebar-history-item.tsx -> features/visibility/actions/update-visibility.ts",
])

// ─── Cross-feature internal directories that are off-limits ─────────────────
const CROSS_FEATURE_BLOCKED_DIRS = ["components", "hooks", "actions", "lib"]

// ─── File collection ────────────────────────────────────────────────────────

/**
 * Recursively collect all .ts/.tsx files under a directory.
 * Excludes test files, node_modules, .next, oldapp, plan.
 */
function collectFiles(dir) {
	const results = []
	if (!existsSync(dir)) return results

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name)

		if (entry.isDirectory()) {
			// Skip excluded directories
			if (
				entry.name === "node_modules" ||
				entry.name === ".next" ||
				entry.name === "oldapp" ||
				entry.name === "plan"
			) {
				continue
			}
			results.push(...collectFiles(fullPath))
		} else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
			// Skip test files
			if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue
			results.push(fullPath)
		}
	}

	return results
}

// ─── Import parsing ─────────────────────────────────────────────────────────

/**
 * Extract import paths from a source file.
 * Handles: import/export from, dynamic import().
 */
function extractImports(content) {
	const imports = []
	const lines = content.split("\n")

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		// Static: import ... from "path" / export ... from "path"
		const staticMatch = line.match(/(?:import|export)\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/)
		if (staticMatch) {
			imports.push({ path: staticMatch[1], line: i + 1 })
			continue
		}

		// Side-effect: import "path"
		const sideEffectMatch = line.match(/^\s*import\s+["']([^"']+)["']/)
		if (sideEffectMatch) {
			imports.push({ path: sideEffectMatch[1], line: i + 1 })
			continue
		}

		// Dynamic: import("path") or await import("path")
		const dynamicMatches = line.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)
		for (const m of dynamicMatches) {
			imports.push({ path: m[1], line: i + 1 })
		}
	}

	return imports
}

// ─── Path resolution ────────────────────────────────────────────────────────

/**
 * Resolve an import path to a project-relative POSIX path.
 * Returns null for external packages.
 */
function resolveImportPath(importPath, importerRelative) {
	// @/ alias — resolve to project-relative
	if (importPath.startsWith("@/")) {
		return importPath.slice(2)
	}

	// Relative imports
	if (importPath.startsWith("./") || importPath.startsWith("../")) {
		const importerDir = dirname(importerRelative)
		const resolved = join(importerDir, importPath).replace(/\\/g, "/")
		// Normalize away any leading ./
		return resolved.replace(/^\.\//, "")
	}

	// External package — not our concern
	return null
}

// ─── Boundary rules ─────────────────────────────────────────────────────────

/**
 * Get the top-level zone of a file: "lib", "components", "features", "app", or null
 */
function getZone(filePath) {
	if (filePath.startsWith("lib/")) return "lib"
	if (filePath.startsWith("components/")) return "components"
	if (filePath.startsWith("features/")) return "features"
	if (filePath.startsWith("app/")) return "app"
	return null
}

/**
 * Extract the feature name from a features/ path.
 * e.g. "features/chat/components/foo.tsx" → "chat"
 */
function getFeatureName(filePath) {
	const match = filePath.match(/^features\/([^/]+)/)
	return match ? match[1] : null
}

/**
 * Extract the internal directory within a feature path.
 * e.g. "features/chat/components/foo.tsx" → "components"
 */
function getFeatureSubDir(filePath) {
	const match = filePath.match(/^features\/[^/]+\/([^/]+)/)
	return match ? match[1] : null
}

/**
 * Check if an import from `importerPath` to `importedPath` violates boundary rules.
 * Returns a violation message or null.
 */
function checkViolation(importerPath, importedPath) {
	const importerZone = getZone(importerPath)
	const importedZone = getZone(importedPath)

	if (!importerZone || !importedZone) return null

	// Rule 1: lib/** → cannot import from features/**, components/**, app/**
	if (importerZone === "lib") {
		if (
			importedZone === "features" ||
			importedZone === "components" ||
			importedZone === "app"
		) {
			return `lib/ cannot import from ${importedZone}/`
		}
	}

	// Rule 2: components/** → cannot import from features/**, app/**
	if (importerZone === "components") {
		if (importedZone === "features" || importedZone === "app") {
			return `components/ cannot import from ${importedZone}/`
		}
	}

	// Rule 3: features/** → cannot import from app/**
	if (importerZone === "features" && importedZone === "app") {
		return "features/ cannot import from app/"
	}

	// Rule 4: features/X/** → cannot import from features/Y internal dirs
	if (importerZone === "features" && importedZone === "features") {
		const importerFeature = getFeatureName(importerPath)
		const importedFeature = getFeatureName(importedPath)

		if (importerFeature && importedFeature && importerFeature !== importedFeature) {
			const importedSubDir = getFeatureSubDir(importedPath)

			if (importedSubDir && CROSS_FEATURE_BLOCKED_DIRS.includes(importedSubDir)) {
				// Check allowlist
				const key = `${importerPath} -> ${importedPath}`

				// Also try with common extensions resolved
				const extensions = [".ts", ".tsx"]
				let allowed = ALLOWLIST.has(key)

				if (!allowed) {
					// Try adding extensions to the imported path
					for (const ext of extensions) {
						if (ALLOWLIST.has(`${importerPath} -> ${importedPath}${ext}`)) {
							allowed = true
							break
						}
					}
				}

				if (!allowed) {
					// Try stripping extensions from both paths for matching
					const stripExt = (p) => p.replace(/\.(ts|tsx)$/, "")
					for (const entry of ALLOWLIST) {
						const [from, to] = entry.split(" -> ")
						if (
							stripExt(importerPath) === stripExt(from) &&
							stripExt(importedPath) === stripExt(to)
						) {
							allowed = true
							break
						}
					}
				}

				if (!allowed) {
					return `features/${importerFeature}/ cannot import from features/${importedFeature}/${importedSubDir}/`
				}
			}
		}
	}

	return null
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
	const violations = []
	const dirs = ["app", "features", "components", "lib"]

	for (const dir of dirs) {
		const fullDir = join(ROOT, dir)
		const files = collectFiles(fullDir)

		for (const filePath of files) {
			const relPath = relative(ROOT, filePath).replace(/\\/g, "/")
			const content = readFileSync(filePath, "utf-8")
			const imports = extractImports(content)

			for (const imp of imports) {
				const resolved = resolveImportPath(imp.path, relPath)
				if (!resolved) continue

				const violation = checkViolation(relPath, resolved)
				if (violation) {
					violations.push({
						file: relPath,
						line: imp.line,
						importPath: imp.path,
						resolved,
						rule: violation,
					})
				}
			}
		}
	}

	if (violations.length > 0) {
		console.error(`\n❌ Found ${violations.length} import boundary violation(s):\n`)
		for (const v of violations) {
			console.error(`  ${v.file}:${v.line}`)
			console.error(`    import: ${v.importPath}`)
			console.error(`    resolved: ${v.resolved}`)
			console.error(`    rule: ${v.rule}\n`)
		}
		process.exit(1)
	}

	console.log("✅ No import boundary violations found.")
	process.exit(0)
}

main()
