// Flow: request-auth | Step: origin-validation
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Helper to create a minimal Request with the given origin/referer headers
 * and a specific URL.
 */
function makeRequest(url: string, headers: Record<string, string> = {}): Request {
	return new Request(url, { headers })
}

describe("validateOrigin", () => {
	// The module caches _staticOrigins, so we need fresh module state per test group
	beforeEach(() => {
		// Clear env vars to control the test environment
		delete process.env.VERCEL_URL
		delete process.env.NEXT_PUBLIC_APP_URL
	})

	afterEach(() => {
		vi.restoreAllMocks()
		delete process.env.VERCEL_URL
		delete process.env.NEXT_PUBLIC_APP_URL
	})

	describe("same-origin requests", () => {
		it("returns true when origin header matches request URL origin", async () => {
			// Re-import to reset the module-level cache
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				origin: "http://localhost:3000",
			})
			expect(mod.validateOrigin(req)).toBe(true)
		})
	})

	describe("missing origin", () => {
		it("returns false when no origin or referer header is present", async () => {
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat")
			expect(mod.validateOrigin(req)).toBe(false)
		})
	})

	describe("referer fallback", () => {
		it("extracts origin from referer when origin header is absent", async () => {
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				referer: "http://localhost:3000/some-page",
			})
			expect(mod.validateOrigin(req)).toBe(true)
		})

		it("returns false for an invalid referer URL", async () => {
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				referer: "not-a-valid-url",
			})
			expect(mod.validateOrigin(req)).toBe(false)
		})
	})

	describe("disallowed origins", () => {
		it("returns false for a cross-origin request not in allowed list", async () => {
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				origin: "http://evil.example.com",
			})
			expect(mod.validateOrigin(req)).toBe(false)
		})
	})

	describe("VERCEL_URL env", () => {
		it("allows origin matching VERCEL_URL (with https prefix)", async () => {
			process.env.VERCEL_URL = "my-app.vercel.app"
			// Re-import to pick up env and reset cache
			vi.resetModules()
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				origin: "https://my-app.vercel.app",
			})
			expect(mod.validateOrigin(req)).toBe(true)
		})
	})

	describe("NEXT_PUBLIC_APP_URL env", () => {
		it("allows origin matching NEXT_PUBLIC_APP_URL", async () => {
			process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com"
			vi.resetModules()
			const mod = await import("@/lib/utils/validate-origin")
			const req = makeRequest("http://localhost:3000/api/chat", {
				origin: "https://myapp.com",
			})
			expect(mod.validateOrigin(req)).toBe(true)
		})
	})
})
