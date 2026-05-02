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
const httpVerbs = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
const routeMetadataExports = new Set(["runtime", "dynamic", "revalidate", "maxDuration", "config"])

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

function routeFiles(): string[] {
	return collectImplementationFiles().filter((file) => {
		const projectPath = toProjectPath(file)
		return projectPath.startsWith("app/api/") && projectPath.endsWith("/route.ts")
	})
}

function actionFiles(): string[] {
	return collectImplementationFiles().filter((file) => {
		const projectPath = toProjectPath(file)
		return projectPath.startsWith("features/") && projectPath.includes("/actions/")
	})
}

describe("action and route boundary rules", () => {
	it("route handlers avoid cache-tag mutation primitives", () => {
		const offenders = routeFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			return [
				/\bupdateTag\s*\(/.test(text) ? `${projectPath}:updateTag-call` : null,
				/from\s+["']next\/cache["']/.test(text) ? `${projectPath}:next-cache-import` : null,
			].filter((offender): offender is string => offender !== null)
		})

		expect(offenders).toEqual([])
	})

	it("server actions avoid raw revalidateTag calls", () => {
		const offenders = actionFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			return [
				/\brevalidateTag\s*\(/.test(text) ? `${projectPath}:revalidateTag-call` : null,
				/from\s+["']next\/cache["']/.test(text) ? `${projectPath}:next-cache-import` : null,
			].filter((offender): offender is string => offender !== null)
		})

		expect(offenders).toEqual([])
	})

	it("server action exports return ActionResult envelopes for expected failures", () => {
		const offenders = actionFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			const exportMatches = [...text.matchAll(/export\s+async\s+function\s+(\w+)/g)]

			return exportMatches.flatMap((match) => {
				const name = match[1]
				if (name === undefined) return []
				const signatureStart = match.index ?? 0
				const signatureEnd = text.indexOf("{", signatureStart)
				const signature = text.slice(signatureStart, signatureEnd)

				return /Promise\s*<\s*ActionResult\b/.test(signature)
					? []
					: [`${projectPath}:${name}:missing-ActionResult-return`]
			})
		})

		expect(offenders).toEqual([])
	})

	it("mutation actions import cache invalidation helpers", () => {
		const mutationActionFiles = actionFiles().filter(
			(file) => !toProjectPath(file).startsWith("features/auth/"),
		)
		const offenders = mutationActionFiles.flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			const mutatesData = /\b(delete|update|upsert|save)\w*\s*\(/.test(text)
			const importsInvalidation = /from\s+["']@\/lib\/cache\/revalidate["']/.test(text)

			return mutatesData && !importsInvalidation
				? [`${projectPath}:missing-invalidation-helper`]
				: []
		})

		expect(offenders).toEqual([])
	})

	it("API route files export only HTTP verb handlers or route metadata", () => {
		const offenders = routeFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			const text = stripComments(readFileSync(file, "utf8"))
			const exportMatches = [
				...text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g),
			]

			return exportMatches
				.flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
				.filter((name) => !httpVerbs.has(name) && !routeMetadataExports.has(name))
				.map((name) => `${projectPath}:export-${name}`)
		})

		expect(offenders).toEqual([])
	})

	it("proxy remains the sole interception file", () => {
		const interceptionFiles = [
			"middleware.ts",
			"middleware.js",
			"src/middleware.ts",
			"src/middleware.js",
		]
		const offenders = interceptionFiles.filter((file) => existsSync(join(root, file)))

		expect(existsSync(join(root, "proxy.ts"))).toBe(true)
		expect(offenders).toEqual([])
	})

	it("app source avoids oldapp and plan imports", () => {
		const offenders = collectImplementationFiles().flatMap((file) => {
			const projectPath = toProjectPath(file)
			if (!projectPath.startsWith("app/")) return []

			const text = stripComments(readFileSync(file, "utf8"))
			return [
				/from\s+["'][^"']*oldapp\//.test(text) ? `${projectPath}:oldapp-import` : null,
				/from\s+["'][^"']*plan\//.test(text) ? `${projectPath}:plan-import` : null,
				/import\(["'][^"']*oldapp\//.test(text)
					? `${projectPath}:oldapp-dynamic-import`
					: null,
				/import\(["'][^"']*plan\//.test(text) ? `${projectPath}:plan-dynamic-import` : null,
			].filter((offender): offender is string => offender !== null)
		})

		expect(offenders).toEqual([])
	})
})
