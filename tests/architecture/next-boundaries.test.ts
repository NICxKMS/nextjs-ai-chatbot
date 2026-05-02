import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(projectPath: string): string {
	return readFileSync(join(root, projectPath), "utf8")
}

function expectFile(projectPath: string): string {
	expect(existsSync(join(root, projectPath))).toBe(true)
	return readProjectFile(projectPath)
}

function expectClientBoundary(source: string) {
	expect(source.trimStart()).toMatch(/^(["'])use client\1/)
	expect(source).toMatch(/error\s*:\s*Error\s*&\s*\{\s*digest\?\s*:\s*string\s*\}/)
	expect(source).toMatch(/reset\s*:\s*\(\)\s*=>\s*void/)
	expect(source).toMatch(/onClick=\{(?:\(\)\s*=>\s*)?reset\s*\(?\)?\}/)
}

function expectRecoveryCopy(source: string, expectedCopy: RegExp[]) {
	expect(source).toMatch(/role=["']alert["']/)
	for (const copy of expectedCopy) {
		expect(source).toMatch(copy)
	}
}

function expectLoadingCopy(source: string, expectedCopy: RegExp[]) {
	for (const copy of expectedCopy) {
		expect(source).toMatch(copy)
	}
}

describe("Next.js app boundary contracts", () => {
	it("keeps the global error boundary as a client component with html/body recovery UI", () => {
		const source = expectFile("app/global-error.tsx")

		expectClientBoundary(source)
		expect(source).toMatch(/<html\b/)
		expect(source).toMatch(/<body\b/)
		expectRecoveryCopy(source, [
			/Something went wrong/,
			/critical error/i,
			/Try Again/,
			/Go Home/,
		])
		expect(source).not.toMatch(
			/export\s+(?:const\s+metadata|async\s+function\s+generateMetadata)/,
		)
	})

	it("keeps chat route error boundaries present with recovery copy", () => {
		const boundaries = [
			{
				path: "app/(chat)/error.tsx",
				copy: [/Something went wrong/, /loading this chat/i, /Try Again/, /Go Home/],
			},
			{
				path: "app/(chat)/chat/[id]/error.tsx",
				copy: [
					/Failed to load conversation/,
					/loading this chat/i,
					/Try Again/,
					/New Chat/,
				],
			},
		]

		for (const boundary of boundaries) {
			const source = expectFile(boundary.path)
			expectClientBoundary(source)
			expectRecoveryCopy(source, boundary.copy)
		}
	})

	it("keeps auth route error boundary present with recovery copy", () => {
		const source = expectFile("app/(auth)/error.tsx")

		expectClientBoundary(source)
		expectRecoveryCopy(source, [
			/Something went wrong/,
			/authentication/i,
			/Try Again/,
			/Go Home/,
		])
	})

	it("keeps chat and auth loading files present with loading copy", () => {
		const loadingStates = [
			{ path: "app/(chat)/loading.tsx", copy: [/Loading chat/] },
			{ path: "app/(chat)/chat/[id]/loading.tsx", copy: [/Loading conversation/] },
			{ path: "app/(auth)/loading.tsx", copy: [/AuthLoadingState/] },
		]

		for (const loadingState of loadingStates) {
			const source = expectFile(loadingState.path)
			expect(source).toMatch(/export\s+default\s+function/)
			expectLoadingCopy(source, loadingState.copy)
		}

		const authLoadingSource = expectFile("features/auth/components/auth-loading-state.tsx")
		expectLoadingCopy(authLoadingSource, [
			/Loading authentication/,
			/Loading authentication form/,
		])
	})

	it("keeps artifact editor error boundary class recovery behavior", () => {
		const source = expectFile("features/artifacts/components/artifact-error-boundary.tsx")

		expect(source.trimStart()).toMatch(/^(["'])use client\1/)
		expect(source).toMatch(/export\s+class\s+ArtifactErrorBoundary\s+extends\s+Component/)
		expect(source).toMatch(/static\s+getDerivedStateFromError\s*\(\s*error\s*:\s*Error\s*\)/)
		expect(source).toMatch(/hasError\s*:\s*true/)
		expect(source).toMatch(
			/componentDidCatch\s*\(\s*error\s*:\s*Error\s*,\s*errorInfo\s*:\s*ErrorInfo\s*\)/,
		)
		expect(source).toMatch(/logger\.error\(/)
		expect(source).toMatch(/role=["']alert["']/)
		expect(source).toMatch(/Failed to render artifact/)
		expect(source).toMatch(/Retry/)
		expect(source).toMatch(/this\.setState\(\{\s*hasError:\s*false,\s*error:\s*null\s*\}\)/)
		expect(source).toMatch(/return\s+this\.props\.children/)
	})
})
