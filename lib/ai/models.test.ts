// Flow: ai-model-selection | Step: model-catalog
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { discoverModels, getModelById, STATIC_MODELS } from "@/lib/ai/models"
import type { ModelMetadata } from "@/lib/types/model.types"

// ── STATIC_MODELS catalog ──────────────────────────────────────────────────

describe("STATIC_MODELS", () => {
	it("is a non-empty array", () => {
		expect(STATIC_MODELS).toBeInstanceOf(Array)
		expect(STATIC_MODELS.length).toBeGreaterThan(0)
	})

	it("contains models from all three providers", () => {
		const providers = new Set(STATIC_MODELS.map((m) => m.provider))
		expect(providers).toContain("google")
		expect(providers).toContain("openai")
		expect(providers).toContain("openrouter")
	})

	it.each(STATIC_MODELS)("$id has required fields", (model) => {
		expect(model.id).toMatch(/^[a-z]+:.+/)
		expect(model.provider).toBeTruthy()
		expect(model.providerModelId).toBeTruthy()
		expect(model.name).toBeTruthy()
		expect(typeof model.supportsToolCalling).toBe("boolean")
		expect(typeof model.supportsReasoning).toBe("boolean")
		expect(model.modalities).toBeDefined()
		expect(model.modalities.input).toBeInstanceOf(Array)
		expect(model.modalities.output).toBeInstanceOf(Array)
		expect(model.contextWindow).toBeGreaterThan(0)
		expect(model.maxOutputTokens).toBeGreaterThan(0)
		expect(model.source).toBe("static")
	})

	it("has unique IDs across all models", () => {
		const ids = STATIC_MODELS.map((m) => m.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it("each model ID starts with its provider prefix", () => {
		for (const model of STATIC_MODELS) {
			expect(model.id.startsWith(`${model.provider}:`)).toBe(true)
		}
	})

	it("reasoning models have a reasoningTagName", () => {
		for (const model of STATIC_MODELS) {
			if (model.supportsReasoning) {
				expect(model.reasoningTagName).toBeTruthy()
			}
		}
	})

	it("non-reasoning models do not have a reasoningTagName", () => {
		for (const model of STATIC_MODELS) {
			if (!model.supportsReasoning) {
				expect(model.reasoningTagName).toBeUndefined()
			}
		}
	})
})

// ── getModelById ───────────────────────────────────────────────────────────

describe("getModelById", () => {
	it("returns the correct model for a known ID", () => {
		const model = getModelById("google:gemini-2.5-flash")
		expect(model).toBeDefined()
		expect(model?.id).toBe("google:gemini-2.5-flash")
		expect(model?.name).toBe("Gemini 2.5 Flash")
		expect(model?.provider).toBe("google")
	})

	it("returns undefined for an unknown ID", () => {
		expect(getModelById("unknown:no-such-model")).toBeUndefined()
	})

	it("returns undefined for empty string", () => {
		expect(getModelById("")).toBeUndefined()
	})

	it("returns the correct model for each static model", () => {
		for (const model of STATIC_MODELS) {
			const found = getModelById(model.id)
			expect(found).toBe(model)
		}
	})

	it("returns models with complete ModelMetadata shape", () => {
		const model = getModelById("openai:gpt-4o")
		expect(model).toBeDefined()

		// Type-safe shape check
		const m = model as ModelMetadata
		expect(m.id).toBe("openai:gpt-4o")
		expect(m.provider).toBe("openai")
		expect(m.providerModelId).toBe("gpt-4o")
		expect(m.contextWindow).toBe(128_000)
		expect(m.maxOutputTokens).toBe(16_384)
		expect(m.source).toBe("static")
	})
})

// ── discoverModels ─────────────────────────────────────────────────────────

describe("discoverModels", () => {
	const originalEnv = process.env

	beforeEach(() => {
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it("returns empty array when OPENROUTER_API_KEY is not set", async () => {
		delete process.env.OPENROUTER_API_KEY
		const result = await discoverModels()
		expect(result).toEqual([])
	})

	it("returns empty array when fetch fails", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"))

		const result = await discoverModels()
		expect(result).toEqual([])
		fetchSpy.mockRestore()
	})

	it("returns empty array when response is not ok", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 500 }))

		const result = await discoverModels()
		expect(result).toEqual([])
		fetchSpy.mockRestore()
	})

	it("returns empty array when response data is malformed", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ data: "not-an-array" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)

		const result = await discoverModels()
		expect(result).toEqual([])
		fetchSpy.mockRestore()
	})

	it("maps OpenRouter models to ModelMetadata", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const mockModels = {
			data: [
				{
					id: "meta-llama/llama-3-70b",
					name: "Llama 3 70B",
					description: "A large language model",
					context_length: 8192,
					top_provider: { max_completion_tokens: 4096 },
					architecture: {
						input_modalities: ["text"],
						output_modalities: ["text"],
					},
				},
			],
		}

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockModels), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)

		const result = await discoverModels()
		expect(result).toHaveLength(1)

		const model = result[0]
		expect(model).toBeDefined()
		expect(model?.id).toBe("openrouter:meta-llama/llama-3-70b")
		expect(model?.provider).toBe("openrouter")
		expect(model?.providerModelId).toBe("meta-llama/llama-3-70b")
		expect(model?.name).toBe("Llama 3 70B")
		expect(model?.description).toBe("A large language model")
		expect(model?.supportsToolCalling).toBe(false) // no supported_parameters
		expect(model?.source).toBe("dynamic")
		expect(model?.contextWindow).toBe(8192)
		expect(model?.maxOutputTokens).toBe(4096)

		fetchSpy.mockRestore()
	})

	it("applies default context/output tokens for models without them", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const mockModels = {
			data: [
				{
					id: "some/model",
					// No context_length, no top_provider
				},
			],
		}

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockModels), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)

		const result = await discoverModels()
		expect(result).toHaveLength(1)
		expect(result[0]?.contextWindow).toBe(4_096) // DEFAULT_CONTEXT_WINDOW
		expect(result[0]?.maxOutputTokens).toBe(4_096) // DEFAULT_MAX_OUTPUT_TOKENS
		expect(result[0]?.name).toBe("some/model") // falls back to id
		expect(result[0]?.modalities).toEqual({ input: ["text"], output: ["text"] })

		fetchSpy.mockRestore()
	})

	it("detects reasoning support via prefix inference for discovered models", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const mockModels = {
			data: [
				{
					id: "deepseek/deepseek-r1",
					name: "DeepSeek R1",
				},
			],
		}

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockModels), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)

		const result = await discoverModels()
		expect(result).toHaveLength(1)
		expect(result[0]?.supportsReasoning).toBe(true)
		expect(result[0]?.reasoningTagName).toBe("think")

		fetchSpy.mockRestore()
	})

	it("enables tool calling when supported_parameters includes 'tools'", async () => {
		process.env.OPENROUTER_API_KEY = "test-key"

		const mockModels = {
			data: [
				{
					id: "anthropic/claude-3.5-sonnet",
					name: "Claude 3.5 Sonnet",
					supported_parameters: ["tools", "temperature", "max_tokens"],
				},
				{
					id: "meta-llama/llama-3-8b",
					name: "Llama 3 8B",
					supported_parameters: ["temperature", "max_tokens"],
				},
				{
					id: "some/model-no-params",
					name: "No Params Model",
				},
			],
		}

		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockModels), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		)

		const result = await discoverModels()
		expect(result).toHaveLength(3)
		expect(result[0]?.supportsToolCalling).toBe(true)
		expect(result[1]?.supportsToolCalling).toBe(false)
		expect(result[2]?.supportsToolCalling).toBe(false)

		fetchSpy.mockRestore()
	})
})
