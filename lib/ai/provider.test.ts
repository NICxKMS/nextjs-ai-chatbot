// Flow: ai-provider | Step: model-provision
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks (hoisted before imports) ──────────────────────────────────────────

const mockLanguageModel = { modelId: "mock-base-model", specificationVersion: "v3" }
const mockEmbeddingModel = { modelId: "mock-embedding" }
const mockImageModel = { modelId: "mock-image" }

vi.mock("@/lib/ai/registry", () => ({
	registry: {
		languageModel: vi.fn(() => mockLanguageModel),
		embeddingModel: vi.fn(() => mockEmbeddingModel),
		imageModel: vi.fn(() => mockImageModel),
	},
}))

vi.mock("@/lib/ai/model-capabilities", () => ({
	getModelCapabilities: vi.fn((modelId: string) => {
		// Simulate reasoning for gemini-2.5 models
		if (modelId.includes("gemini-2.5")) {
			return {
				reasoningTag: { tagName: "thinking" },
				supportsToolCalling: true,
				supportsReasoning: true,
			}
		}
		return {
			reasoningTag: null,
			supportsToolCalling: true,
			supportsReasoning: false,
		}
	}),
}))

vi.mock("ai", () => ({
	extractReasoningMiddleware: vi.fn((tag: { tagName: string }) => ({
		_tag: tag,
		_type: "reasoning-middleware",
	})),
	wrapLanguageModel: vi.fn(({ model }: { model: unknown }) => ({
		...(model as Record<string, unknown>),
		_wrapped: true,
	})),
}))

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { myProvider } from "@/lib/ai/provider"
import { registry } from "@/lib/ai/registry"

// ── Tests ───────────────────────────────────────────────────────────────────

describe("myProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("exposes specificationVersion v3", () => {
		expect(myProvider.specificationVersion).toBe("v3")
	})

	// ── languageModel ───────────────────────────────────────────────────

	describe("languageModel", () => {
		it("resolves a model through the registry", () => {
			const model = myProvider.languageModel("openai:gpt-4o")

			expect(registry.languageModel).toHaveBeenCalledWith("openai:gpt-4o")
			expect(model).toBeDefined()
		})

		it("wraps reasoning models with middleware", () => {
			const model = myProvider.languageModel("google:gemini-2.5-flash")

			// Should have been wrapped
			expect((model as any)._wrapped).toBe(true)
		})

		it("does not wrap non-reasoning models", () => {
			const model = myProvider.languageModel("openai:gpt-4o")

			// Should be the base model without wrapping
			expect((model as any)._wrapped).toBeUndefined()
		})

		it("caches language model instances", () => {
			// Use a model ID not used by earlier tests to avoid hitting the
			// module-level modelCache populated by previous test runs.
			const first = myProvider.languageModel("openai:gpt-4o-mini")
			const second = myProvider.languageModel("openai:gpt-4o-mini")

			expect(first).toBe(second)
			// Registry should only be called once due to cache
			expect(registry.languageModel).toHaveBeenCalledTimes(1)
		})

		it("caches reasoning-wrapped models too", () => {
			const first = myProvider.languageModel("google:gemini-2.5-flash")
			const second = myProvider.languageModel("google:gemini-2.5-flash")

			expect(first).toBe(second)
		})
	})

	// ── assertValidModelId (via public API) ─────────────────────────────

	describe("model ID validation", () => {
		it("accepts valid provider:model format", () => {
			expect(() => myProvider.languageModel("openai:gpt-4o")).not.toThrow()
		})

		it("accepts model IDs with slashes (OpenRouter)", () => {
			expect(() =>
				myProvider.languageModel("openrouter:anthropic/claude-3.5-sonnet"),
			).not.toThrow()
		})

		it("accepts model IDs with dots", () => {
			expect(() => myProvider.languageModel("openai:gpt-4.1")).not.toThrow()
		})

		it("rejects model IDs with colons in the model part", () => {
			// The regex does not allow ":" in the model-name segment
			expect(() => myProvider.languageModel("openrouter:deepseek/deepseek-r1:free")).toThrow(
				/Invalid model ID/,
			)
		})

		it("throws for empty string", () => {
			expect(() => myProvider.languageModel("")).toThrow(/Invalid model ID/)
		})

		it("throws for model ID without colon separator", () => {
			expect(() => myProvider.languageModel("gpt4o")).toThrow(/Invalid model ID/)
		})

		it("throws for model ID with empty provider", () => {
			expect(() => myProvider.languageModel(":gpt-4o")).toThrow(/Invalid model ID/)
		})

		it("throws for model ID with empty model name", () => {
			expect(() => myProvider.languageModel("openai:")).toThrow(/Invalid model ID/)
		})

		it("throws for model ID starting with a number", () => {
			expect(() => myProvider.languageModel("123:model")).toThrow(/Invalid model ID/)
		})
	})

	// ── embeddingModel ──────────────────────────────────────────────────

	describe("embeddingModel", () => {
		it("delegates to registry.embeddingModel", () => {
			const model = myProvider.embeddingModel?.("openai:text-embedding-3-small")

			expect(registry.embeddingModel).toHaveBeenCalledWith("openai:text-embedding-3-small")
			expect(model).toBeDefined()
		})

		it("throws for invalid model ID", () => {
			expect(() => myProvider.embeddingModel?.("invalid")).toThrow(/Invalid model ID/)
		})
	})

	// ── imageModel ──────────────────────────────────────────────────────

	describe("imageModel", () => {
		it("delegates to registry.imageModel", () => {
			const model = myProvider.imageModel?.("openai:dall-e-3")

			expect(registry.imageModel).toHaveBeenCalledWith("openai:dall-e-3")
			expect(model).toBeDefined()
		})

		it("throws for invalid model ID", () => {
			expect(() => myProvider.imageModel?.("invalid")).toThrow(/Invalid model ID/)
		})
	})
})
