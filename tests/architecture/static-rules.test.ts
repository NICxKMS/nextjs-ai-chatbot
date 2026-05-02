import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const implementationRoots = ["app", "components", "features", "hooks", "lib", "scripts"]
const ignoredDirs = new Set([
	"node_modules",
	".next",
	"oldapp",
	"plan",
	"plan-archives",
	".opencode",
])

function collectSourceFiles(dir: string): string[] {
	const entries = readdirSync(dir)
	const files: string[] = []

	for (const entry of entries) {
		if (ignoredDirs.has(entry)) continue
		const fullPath = join(dir, entry)
		const stat = statSync(fullPath)
		if (stat.isDirectory()) {
			files.push(...collectSourceFiles(fullPath))
			continue
		}
		if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
			files.push(fullPath)
		}
	}

	return files
}

function collectImplementationFiles(): string[] {
	return implementationRoots
		.map((dir) => join(root, dir))
		.filter((dir) => existsSync(dir))
		.flatMap((dir) => collectSourceFiles(dir))
}

function toProjectPath(file: string): string {
	return relative(root, file).split(sep).join("/")
}

function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

function findTextOffenders(patterns: RegExp[]): string[] {
	return collectImplementationFiles().flatMap((file) => {
		const text = stripComments(readFileSync(file, "utf8"))
		return patterns
			.filter((pattern) => pattern.test(text))
			.map((pattern) => `${toProjectPath(file)}:${pattern.source}`)
	})
}

function findTextMatches(pattern: RegExp): string[] {
	return collectImplementationFiles().flatMap((file) => {
		const text = stripComments(readFileSync(file, "utf8"))
		return pattern.test(text) ? [toProjectPath(file)] : []
	})
}

describe("static architecture rules", () => {
	it("uses Next.js 16 proxy.ts instead of middleware.ts", () => {
		expect(existsSync(join(root, "proxy.ts"))).toBe(true)
		expect(existsSync(join(root, "middleware.ts"))).toBe(false)
	})

	it("keeps proxy matched across chat, auth, and API surfaces", () => {
		const proxySource = readFileSync(join(root, "proxy.ts"), "utf8")

		expect(proxySource).toContain('"/"')
		expect(proxySource).toContain('"/chat/:path*"')
		expect(proxySource).toContain('"/login"')
		expect(proxySource).toContain('"/register"')
		expect(proxySource).toContain('"/api/:path*"')
	})

	it("keeps deleted active tests out of source-owned directories", () => {
		const sourceFiles = collectImplementationFiles().map(toProjectPath)
		const colocatedTests = sourceFiles.filter(
			(file) =>
				(file.startsWith("features") || file.startsWith("lib") || file.startsWith("app")) &&
				/\.(test|spec)\.(ts|tsx)$/.test(file),
		)

		expect(colocatedTests).toEqual([])
	})

	it("keeps critical removed redesign identifiers out of implementation code", () => {
		const forbidden = [
			/documentId/,
			/DocumentHandler/,
			/DocumentKind/,
			/createDocument/,
			/updateDocument/,
			/DataStreamHandler/,
			/DataStreamProvider/,
			/OptimisticChats/,
			/VoteHydrator/,
			/AuthProvider/,
			/SettingsProvider/,
		]
		const offenders = findTextOffenders(forbidden)

		expect(offenders).toEqual([])
	})

	it("does not use global browser events for cross-feature state updates", () => {
		expect(findTextOffenders([/window\.dispatchEvent/])).toEqual([])
	})

	it("keeps removed gateway, quota, and entitlement logic out of implementation code", () => {
		const forbiddenLogic = [
			/\bAppUsage\b/,
			/activate_gateway/,
			/vercel-gateway/,
			/\bentitlements?\b/i,
			/\bcredit card\b/i,
			/\bquota\s*(?:check|counter|limit|remaining|reset|tracking|usage)\b/i,
		]

		expect(findTextOffenders(forbiddenLogic)).toEqual([])
	})

	it("keeps oldapp and plan imports out of active implementation code", () => {
		const offenders = findTextOffenders([
			/from\s+["'][^"']*oldapp\//,
			/from\s+["'][^"']*plan\//,
			/import\(["'][^"']*oldapp\//,
			/import\(["'][^"']*plan\//,
		])

		expect(offenders).toEqual([])
	})

	it("keeps gateway, credit, and quota UI terminology out of implementation code", () => {
		const forbiddenUiTerms = [
			/\bgateway\b/i,
			/\bcredits?\b/i,
			/\bquotas?\s*(?:banner|badge|card|dialog|label|meter|modal|notice|panel|text|warning)\b/i,
			/\busage\s+limit\b/i,
			/\bremaining\s+messages\b/i,
		]

		expect(findTextOffenders(forbiddenUiTerms)).toEqual([])
	})

	it("keeps generated ai-elements out of editable source test coverage", () => {
		const offenders = collectImplementationFiles()
			.map(toProjectPath)
			.filter(
				(file) =>
					file.startsWith("components/ai-elements/") &&
					/\.(test|spec)\.(ts|tsx)$/.test(file),
			)

		expect(offenders).toEqual([])
	})

	it("keeps core import boundaries pointed inward", () => {
		const offenders = collectImplementationFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			const rules: Array<[boolean, RegExp, string]> = [
				[
					projectPath.startsWith("lib/"),
					/from\s+["']@\/(app|features|components)\//,
					"lib->outer",
				],
				[projectPath.startsWith("features/"), /from\s+["']@\/app\//, "features->app"],
				[
					projectPath.startsWith("components/ui/"),
					/from\s+["']@\/(app|features)\//,
					"ui->app-or-features",
				],
			]

			return rules
				.filter(([applies, pattern]) => applies && pattern.test(text))
				.map(([, pattern, rule]) => `${projectPath}:${rule}:${pattern.source}`)
		})

		expect(offenders).toEqual([])
	})

	it("keeps SWR usage local to hooks or provider-scoped cache mutation", () => {
		const offenders = collectImplementationFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			const hasGlobalMutateImport =
				/import\s+\{[^}]*\bmutate\b[^}]*\}\s+from\s+["']swr["']/.test(text)
			const hasSerializedInfiniteMutation = /unstable_serialize/.test(text)
			const hasNullSWRFetcher = /useSWR(?:<[^>]+>)?\([^,]+,\s*null\s*,/.test(text)

			return [
				hasGlobalMutateImport ? `${projectPath}:global-mutate-import` : null,
				hasSerializedInfiniteMutation ? `${projectPath}:unstable-serialize-mutation` : null,
				hasNullSWRFetcher ? `${projectPath}:null-fetcher-state-cache` : null,
			].filter((offender): offender is string => offender !== null)
		})

		expect(offenders).toEqual([])
	})

	it("keeps Server Actions out of API route files", () => {
		const offenders = collectImplementationFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			if (!projectPath.startsWith("app/api/") || !projectPath.endsWith("/route.ts")) {
				return []
			}

			const text = stripComments(readFileSync(file, "utf8"))
			return [
				/^\s*["']use server["']/m.test(text) ? `${projectPath}:use-server` : null,
				/from\s+["']@\/features\/[^"']+\/actions\//.test(text)
					? `${projectPath}:imports-server-action`
					: null,
			].filter((offender): offender is string => offender !== null)
		})

		expect(offenders).toEqual([])
	})

	it("keeps AI SDK wire data parts while internal DataPart contracts stay unprefixed", () => {
		expect(findTextMatches(/\bdata-chat-title\b/)).not.toEqual([])
		expect(findTextMatches(/\bdata-usage\b/)).not.toEqual([])
		expect(findTextMatches(/\bdata-error\b/)).not.toEqual([])

		const dataPartContract =
			/DataPart[\s\S]*?["']chat-title["'][\s\S]*?["']usage["'][\s\S]*?["']error["']/s
		expect(
			collectImplementationFiles().some((file) =>
				dataPartContract.test(stripComments(readFileSync(file, "utf8"))),
			),
		).toBe(true)
	})

	it("strips the data- prefix before artifact processing in use-chat-session.ts", () => {
		const useChatSessionFile = collectImplementationFiles().find((file) =>
			toProjectPath(file).endsWith("use-chat-session.ts"),
		)

		expect(useChatSessionFile).toBeDefined()
		if (!useChatSessionFile) {
			throw new Error("use-chat-session.ts not found")
		}
		const text = stripComments(readFileSync(useChatSessionFile, "utf8"))
		expect(text).toMatch(/artifact/)
		expect(
			/(?:replace\(\s*\/\^data-\/?\s*,\s*["']?["']\s*\)|replace\(\s*["']data-["']\s*,\s*["']?["']\s*\)|slice\(5\))/s.test(
				text,
			),
		).toBe(true)
	})
})
