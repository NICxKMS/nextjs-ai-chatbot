import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ModelMetadata } from "@/lib/types/model.types"
import { DEFAULT_CHAT_MODEL, MODEL_COOKIE_NAME } from "@/lib/types/model.types"

vi.mock("server-only", () => ({}))

const mockCacheTag = vi.fn()
const mockCacheLife = vi.fn()
vi.mock("next/cache", () => ({
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}))

const mockCookies = vi.fn()
vi.mock("next/headers", () => ({
	cookies: (...args: unknown[]) => mockCookies(...args),
}))

const mockDiscoverModels = vi.fn()

const STATIC_MODELS_MOCK: ModelMetadata[] = [
	{
		id: "openai:gpt-4o",
		provider: "openai",
		providerModelId: "gpt-4o",
		name: "OpenAI Static",
		supportsToolCalling: true,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 16_384,
		source: "static",
	},
	{
		id: "google:gemma-3-4b-it",
		provider: "google",
		providerModelId: "gemma-3-4b-it",
		name: "Google Static",
		supportsToolCalling: false,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
]

vi.mock("@/lib/ai/models", () => ({
	discoverModels: (...args: unknown[]) => mockDiscoverModels(...args),
	STATIC_MODELS: STATIC_MODELS_MOCK,
}))

const mockGetAvailableProviderIds = vi.fn()
vi.mock("@/lib/ai/registry", () => ({
	getAvailableProviderIds: (...args: unknown[]) => mockGetAvailableProviderIds(...args),
}))

function createModel(overrides: Partial<ModelMetadata>): ModelMetadata {
	return {
		id: "openrouter:test-model",
		provider: "openrouter",
		providerModelId: "test-model",
		name: "Dynamic Model",
		supportsToolCalling: true,
		supportsReasoning: true,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 64_000,
		maxOutputTokens: 8_192,
		source: "dynamic",
		...overrides,
	}
}

describe("features/models/lib/models", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockDiscoverModels.mockResolvedValue([])
		mockGetAvailableProviderIds.mockReturnValue(new Set(["openai", "google"]))
		mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) })
	})

	it("returns static + discovered models, deduped by id and filtered by available providers", async () => {
		const { getAvailableModels } = await import("@/features/models/lib/models")

		mockDiscoverModels.mockResolvedValue([
			createModel({
				id: "openai:gpt-4o",
				provider: "openai",
				providerModelId: "gpt-4o",
				name: "OpenAI Dynamic Duplicate",
			}),
			createModel({ id: "openrouter:anthropic/claude-3.5-sonnet", provider: "openrouter" }),
		])
		mockGetAvailableProviderIds.mockReturnValue(new Set(["openai", "openrouter"]))

		const models = await getAvailableModels()

		expect(models).toHaveLength(2)
		expect(models.map((model) => model.id)).toEqual([
			"openai:gpt-4o",
			"openrouter:anthropic/claude-3.5-sonnet",
		])
		expect(models[0]?.name).toBe("OpenAI Static")
		expect(mockCacheTag).toHaveBeenCalledWith("models")
		expect(mockCacheLife).toHaveBeenCalledWith("hours")
	})

	it("returns cookie-selected model when it exists in available catalog", async () => {
		const { getDefaultModel } = await import("@/features/models/lib/models")

		mockCookies.mockResolvedValue({
			get: vi.fn().mockReturnValue({ name: MODEL_COOKIE_NAME, value: "openai:gpt-4o" }),
		})
		mockGetAvailableProviderIds.mockReturnValue(new Set(["openai"]))
		mockDiscoverModels.mockResolvedValue([])

		const modelId = await getDefaultModel(null)

		expect(modelId).toBe("openai:gpt-4o")
	})

	it("falls back to default model when cookie value is not available", async () => {
		const { getDefaultModel } = await import("@/features/models/lib/models")

		mockCookies.mockResolvedValue({
			get: vi.fn().mockReturnValue({ name: MODEL_COOKIE_NAME, value: "unknown:model" }),
		})
		mockGetAvailableProviderIds.mockReturnValue(new Set(["openai"]))
		mockDiscoverModels.mockResolvedValue([])

		const modelId = await getDefaultModel(null)

		expect(modelId).toBe(DEFAULT_CHAT_MODEL)
	})

	it("falls back to default model when no cookie is set", async () => {
		const { getDefaultModel } = await import("@/features/models/lib/models")

		mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) })

		const modelId = await getDefaultModel(null)

		expect(modelId).toBe(DEFAULT_CHAT_MODEL)
	})

	it("reuses a provided catalog when validating the preferred model", async () => {
		const { getDefaultModel } = await import("@/features/models/lib/models")

		mockCookies.mockResolvedValue({
			get: vi.fn().mockReturnValue({ name: MODEL_COOKIE_NAME, value: "openai:gpt-4o" }),
		})

		const modelId = await getDefaultModel(null, STATIC_MODELS_MOCK)

		expect(modelId).toBe("openai:gpt-4o")
		expect(mockDiscoverModels).not.toHaveBeenCalled()
		expect(mockGetAvailableProviderIds).not.toHaveBeenCalled()
	})
})
