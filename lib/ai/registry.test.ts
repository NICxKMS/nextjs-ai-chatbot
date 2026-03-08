// Flow: ai-provider-registry | Step: provider-registration
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks (hoisted before imports) ──────────────────────────────────────────

vi.mock("@ai-sdk/google", () => ({
	createGoogleGenerativeAI: vi.fn(() => ({ id: "mock-google-provider" })),
}))

vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: vi.fn(() => ({ id: "mock-openai-provider" })),
}))

vi.mock("@openrouter/ai-sdk-provider", () => ({
	createOpenRouter: vi.fn(() => ({ id: "mock-openrouter-provider" })),
}))

vi.mock("ai", () => ({
	createProviderRegistry: vi.fn((providers: Record<string, unknown>) => ({
		_providers: providers,
		languageModel: vi.fn(),
	})),
}))

// ── Tests ───────────────────────────────────────────────────────────────────

describe("lib/ai/registry", () => {
	const originalEnv = process.env

	beforeEach(() => {
		vi.resetModules()
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	// ── isProviderConfigured ────────────────────────────────────────────

	describe("isProviderConfigured", () => {
		it("returns true when GEMINI_API_KEY is set", async () => {
			process.env.GEMINI_API_KEY = "test-gemini-key"
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("google")).toBe(true)
		})

		it("returns false when GEMINI_API_KEY is missing", async () => {
			delete process.env.GEMINI_API_KEY
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("google")).toBe(false)
		})

		it("returns true when OPENAI_API_KEY is set", async () => {
			process.env.OPENAI_API_KEY = "test-openai-key"
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("openai")).toBe(true)
		})

		it("returns false when OPENAI_API_KEY is missing", async () => {
			delete process.env.OPENAI_API_KEY
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("openai")).toBe(false)
		})

		it("returns true when OPENROUTER_API_KEY is set", async () => {
			process.env.OPENROUTER_API_KEY = "test-openrouter-key"
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("openrouter")).toBe(true)
		})

		it("returns false when OPENROUTER_API_KEY is missing", async () => {
			delete process.env.OPENROUTER_API_KEY
			const { isProviderConfigured } = await import("@/lib/ai/registry")
			expect(isProviderConfigured("openrouter")).toBe(false)
		})
	})

	// ── getRequiredProviderEnvKey ────────────────────────────────────────

	describe("getRequiredProviderEnvKey", () => {
		it('returns "GEMINI_API_KEY" for google', async () => {
			const { getRequiredProviderEnvKey } = await import("@/lib/ai/registry")
			expect(getRequiredProviderEnvKey("google")).toBe("GEMINI_API_KEY")
		})

		it('returns "OPENAI_API_KEY" for openai', async () => {
			const { getRequiredProviderEnvKey } = await import("@/lib/ai/registry")
			expect(getRequiredProviderEnvKey("openai")).toBe("OPENAI_API_KEY")
		})

		it('returns "OPENROUTER_API_KEY" for openrouter', async () => {
			const { getRequiredProviderEnvKey } = await import("@/lib/ai/registry")
			expect(getRequiredProviderEnvKey("openrouter")).toBe("OPENROUTER_API_KEY")
		})
	})

	// ── getAvailableProviderIds ─────────────────────────────────────────

	describe("getAvailableProviderIds", () => {
		it("returns only providers with configured env vars", async () => {
			process.env.GEMINI_API_KEY = "test-gemini"
			process.env.OPENAI_API_KEY = "test-openai"
			delete process.env.OPENROUTER_API_KEY

			const { getAvailableProviderIds } = await import("@/lib/ai/registry")
			const ids = getAvailableProviderIds()

			expect(ids).toBeInstanceOf(Set)
			expect(ids.has("google")).toBe(true)
			expect(ids.has("openai")).toBe(true)
			expect(ids.has("openrouter")).toBe(false)
		})

		it("returns empty set when no API keys are configured", async () => {
			delete process.env.GEMINI_API_KEY
			delete process.env.OPENAI_API_KEY
			delete process.env.OPENROUTER_API_KEY

			const { getAvailableProviderIds } = await import("@/lib/ai/registry")
			const ids = getAvailableProviderIds()

			expect(ids).toBeInstanceOf(Set)
			expect(ids.size).toBe(0)
		})

		it("returns all providers when all keys are set", async () => {
			process.env.GEMINI_API_KEY = "test-gemini"
			process.env.OPENAI_API_KEY = "test-openai"
			process.env.OPENROUTER_API_KEY = "test-openrouter"

			const { getAvailableProviderIds } = await import("@/lib/ai/registry")
			const ids = getAvailableProviderIds()

			expect(ids.size).toBe(3)
			expect(ids.has("google")).toBe(true)
			expect(ids.has("openai")).toBe(true)
			expect(ids.has("openrouter")).toBe(true)
		})

		it("caches the result on subsequent calls", async () => {
			process.env.GEMINI_API_KEY = "test-gemini"

			const { getAvailableProviderIds } = await import("@/lib/ai/registry")
			const first = getAvailableProviderIds()
			const second = getAvailableProviderIds()

			expect(first).toBe(second) // same reference = cached
		})
	})

	// ── registry ────────────────────────────────────────────────────────

	describe("registry", () => {
		it("is exported and has languageModel method", async () => {
			process.env.GEMINI_API_KEY = "test-gemini"
			const { registry } = await import("@/lib/ai/registry")

			expect(registry).toBeDefined()
			expect(typeof registry.languageModel).toBe("function")
		})

		it("registers google provider even without env key (registerWithoutEnv)", async () => {
			delete process.env.GEMINI_API_KEY
			delete process.env.OPENAI_API_KEY
			delete process.env.OPENROUTER_API_KEY

			const { createProviderRegistry } = await import("ai")
			await import("@/lib/ai/registry")

			const calls = vi.mocked(createProviderRegistry).mock.calls
			expect(calls.length).toBeGreaterThan(0)

			const providers = calls[calls.length - 1]?.[0] as Record<string, unknown>
			expect(providers).toHaveProperty("google")
			expect(providers).not.toHaveProperty("openai")
			expect(providers).not.toHaveProperty("openrouter")
		})

		it("registers conditional providers when their env key is set", async () => {
			process.env.GEMINI_API_KEY = "test-gemini"
			process.env.OPENAI_API_KEY = "test-openai"
			process.env.OPENROUTER_API_KEY = "test-openrouter"

			const { createProviderRegistry } = await import("ai")
			await import("@/lib/ai/registry")

			const calls = vi.mocked(createProviderRegistry).mock.calls
			const providers = calls[calls.length - 1]?.[0] as Record<string, unknown>
			expect(providers).toHaveProperty("google")
			expect(providers).toHaveProperty("openai")
			expect(providers).toHaveProperty("openrouter")
		})
	})
})
