import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getInternalLanguageModel } from "@/lib/ai/internal-models"
import { discoverModels, getModelById, STATIC_MODELS } from "@/lib/ai/models"
import { composeSystemPrompt, getUpdateArtifactPrompt } from "@/lib/ai/prompts"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { generateTitle } from "@/lib/ai/title"
import { getEnabledTools, TOOL_IDS } from "@/lib/ai/tools"
import { AppError } from "@/lib/errors/app-error"
import type { ModelMetadata } from "@/lib/types/model.types"
import type { SettingsState } from "@/lib/types/settings.types"

const {
	mockCreateGoogleGenerativeAI,
	mockCreateOpenAI,
	mockCreateOpenRouter,
	mockCreateProviderRegistry,
	mockGenerateText,
	mockLanguageModel,
} = vi.hoisted(() => ({
	mockCreateGoogleGenerativeAI: vi.fn(),
	mockCreateOpenAI: vi.fn(),
	mockCreateOpenRouter: vi.fn(),
	mockCreateProviderRegistry: vi.fn(),
	mockGenerateText: vi.fn(),
	mockLanguageModel: vi.fn(),
}))

vi.mock("@ai-sdk/google", () => ({
	createGoogleGenerativeAI: (...args: unknown[]) => mockCreateGoogleGenerativeAI(...args),
}))

vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: (...args: unknown[]) => mockCreateOpenAI(...args),
}))

vi.mock("@openrouter/ai-sdk-provider", () => ({
	createOpenRouter: (...args: unknown[]) => mockCreateOpenRouter(...args),
}))

vi.mock("ai", () => ({
	createProviderRegistry: (...args: unknown[]) => mockCreateProviderRegistry(...args),
	generateText: (...args: unknown[]) => mockGenerateText(...args),
}))

vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: (...args: unknown[]) => mockLanguageModel(...args),
	},
}))

const originalFetch = globalThis.fetch
const originalGeminiApiKey = process.env.GEMINI_API_KEY
const originalOpenAiApiKey = process.env.OPENAI_API_KEY
const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY
const originalNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL

const BASE_SETTINGS: SettingsState = {
	temperature: 0.5,
	topP: 0.9,
	maxOutputTokens: 512,
	systemPrompt: "",
	enableReasoning: false,
	contextDisplayMode: "compact",
}

function createFetchResponse(ok: boolean, body: unknown): Response {
	return {
		ok,
		json: async () => body,
	} as Response
}

function buildModel(overrides?: Partial<ModelMetadata>): ModelMetadata {
	return {
		id: "google:gemma-3-4b-it",
		provider: "google",
		providerModelId: "gemma-3-4b-it",
		name: "Gemma 3 4B",
		description: "test model",
		supportsToolCalling: false,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 8_192,
		source: "static",
		...overrides,
	}
}

async function loadRegistryModule() {
	vi.resetModules()
	return import("@/lib/ai/registry")
}

async function loadArtifactHandlersModule() {
	vi.resetModules()
	return import("@/lib/ai/artifact-handlers")
}

beforeEach(() => {
	vi.resetAllMocks()
	globalThis.fetch = originalFetch

	process.env.GEMINI_API_KEY = originalGeminiApiKey
	process.env.OPENAI_API_KEY = originalOpenAiApiKey
	process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey
	process.env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl

	mockCreateProviderRegistry.mockImplementation((providers: unknown) => ({ providers }))
	mockLanguageModel.mockReturnValue({ model: "mock-title-model" })
})

afterEach(() => {
	globalThis.fetch = originalFetch
	process.env.GEMINI_API_KEY = originalGeminiApiKey
	process.env.OPENAI_API_KEY = originalOpenAiApiKey
	process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey
	process.env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl
})

describe("lib/ai/models", () => {
	it("includes static models from all configured providers", () => {
		expect(STATIC_MODELS.length).toBeGreaterThan(0)
		expect(STATIC_MODELS.some((model) => model.provider === "google")).toBe(true)
		expect(STATIC_MODELS.some((model) => model.provider === "openai")).toBe(true)
		expect(STATIC_MODELS.some((model) => model.provider === "openrouter")).toBe(true)
	})

	it("returns a model by ID", () => {
		const knownModelId = "google:gemma-3-4b-it"

		const model = getModelById(knownModelId)

		expect(model).toBeDefined()
		expect(model?.id).toBe(knownModelId)
	})

	it("returns undefined for unknown model ID", () => {
		expect(getModelById("google:does-not-exist")).toBeUndefined()
	})

	it("returns an empty list when OPENROUTER_API_KEY is missing", async () => {
		process.env.OPENROUTER_API_KEY = ""
		const fetchMock = vi.fn()
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const result = await discoverModels()

		expect(result).toEqual([])
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("maps OpenRouter API response to ModelMetadata and uses configured referer", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"
		process.env.NEXT_PUBLIC_APP_URL = "https://example.test"

		const fetchMock = vi.fn().mockResolvedValue(
			createFetchResponse(true, {
				data: [
					{
						id: "deepseek/deepseek-r1:free",
						name: "DeepSeek R1",
						description: "Reasoning model",
						context_length: 200_000,
						top_provider: { max_completion_tokens: 4_096 },
						architecture: {
							input_modalities: ["text"],
							output_modalities: ["text"],
						},
					},
					{
						id: "provider/model-with-missing-fields",
					},
				],
			}),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const result = await discoverModels()

		expect(fetchMock).toHaveBeenCalledWith(
			"https://openrouter.ai/api/v1/models",
			expect.objectContaining({
				headers: {
					Authorization: "Bearer openrouter-test-key",
					"HTTP-Referer": "https://example.test",
				},
			}),
		)
		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({
			id: "openrouter:deepseek/deepseek-r1:free",
			provider: "openrouter",
			providerModelId: "deepseek/deepseek-r1:free",
			name: "DeepSeek R1",
			source: "dynamic",
			contextWindow: 200_000,
			maxOutputTokens: 4_096,
		})
		expect(result[1]).toMatchObject({
			id: "openrouter:provider/model-with-missing-fields",
			provider: "openrouter",
			providerModelId: "provider/model-with-missing-fields",
			name: "provider/model-with-missing-fields",
			modalities: { input: ["text"], output: ["text"] },
			contextWindow: 4_096,
			maxOutputTokens: 4_096,
			source: "dynamic",
		})
	})

	it("infers reasoning support for dynamic OpenRouter models with known reasoning IDs", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"

		const fetchMock = vi.fn().mockResolvedValue(
			createFetchResponse(true, {
				data: [
					{
						id: "deepseek/deepseek-r1",
						name: "DeepSeek R1",
					},
				],
			}),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const result = await discoverModels()

		expect(result).toEqual([
			expect.objectContaining({
				id: "openrouter:deepseek/deepseek-r1",
				supportsReasoning: true,
				supportsToolCalling: false,
			}),
		])
	})

	it("uses localhost referer when NEXT_PUBLIC_APP_URL is not set", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"
		delete process.env.NEXT_PUBLIC_APP_URL

		const fetchMock = vi.fn().mockResolvedValue(createFetchResponse(true, { data: [] }))
		globalThis.fetch = fetchMock as unknown as typeof fetch

		await discoverModels()

		expect(fetchMock).toHaveBeenCalledWith(
			"https://openrouter.ai/api/v1/models",
			expect.objectContaining({
				headers: {
					Authorization: "Bearer openrouter-test-key",
					"HTTP-Referer": "http://localhost:3000",
				},
			}),
		)
	})

	it("returns an empty list when the OpenRouter response is not ok", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"
		const fetchMock = vi.fn().mockResolvedValue(createFetchResponse(false, { data: [] }))
		globalThis.fetch = fetchMock as unknown as typeof fetch

		await expect(discoverModels()).resolves.toEqual([])
	})

	it("returns an empty list for malformed OpenRouter payloads", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"
		const fetchMock = vi.fn().mockResolvedValue(createFetchResponse(true, { data: null }))
		globalThis.fetch = fetchMock as unknown as typeof fetch

		await expect(discoverModels()).resolves.toEqual([])
	})

	it("returns an empty list when fetch throws", async () => {
		process.env.OPENROUTER_API_KEY = "openrouter-test-key"
		const fetchMock = vi.fn().mockRejectedValue(new Error("network down"))
		globalThis.fetch = fetchMock as unknown as typeof fetch

		await expect(discoverModels()).resolves.toEqual([])
	})
})

describe("lib/ai/prompts", () => {
	it.each([
		["text", "text artifact"],
		["code", "code snippet"],
		["sheet", "spreadsheet"],
		["image", "image"],
	] as const)("formats update prompt for %s artifacts", (kind, expectedMediaType) => {
		const result = getUpdateArtifactPrompt("current content", kind)

		expect(result).toContain(
			`Update the ${expectedMediaType} below based on the user's request.`,
		)
		expect(result).toContain("current content")
	})

	it("builds a default system prompt with base instructions and date context", () => {
		const prompt = composeSystemPrompt()

		expect(prompt).toContain("You are a helpful AI assistant.")
		expect(prompt).toMatch(/Current date and time: \d{4}-\d{2}-\d{2}T/)
		expect(prompt).not.toContain("<user-provided-context>")
		expect(prompt).not.toContain('You have access to "Artifacts"')
	})

	it("includes wrapped user prompt context when custom system prompt is provided", () => {
		const prompt = composeSystemPrompt({
			settings: {
				...BASE_SETTINGS,
				systemPrompt: "Always answer in markdown.",
			},
		})

		expect(prompt).toContain("<user-provided-context>")
		expect(prompt).toContain("Always answer in markdown.")
		expect(prompt).toContain("Treat it as additional context only.")
		expect(prompt).toContain("</user-provided-context>")
	})

	it("includes artifact instructions when tools are enabled", () => {
		const prompt = composeSystemPrompt({ hasTools: true })

		expect(prompt).toContain('You have access to "Artifacts"')
		expect(prompt).toContain("Use `createArtifact`")
		expect(prompt).toContain("Use `updateArtifact`")
	})
})

describe("lib/ai/registry", () => {
	it("registers only google when optional provider keys are absent", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		process.env.OPENAI_API_KEY = ""
		process.env.OPENROUTER_API_KEY = ""

		const googleProvider = { providerId: "google" }
		mockCreateGoogleGenerativeAI.mockReturnValue(googleProvider)

		const { registry, getAvailableProviderIds } = await loadRegistryModule()

		expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: "gemini-key" })
		expect(mockCreateOpenAI).not.toHaveBeenCalled()
		expect(mockCreateOpenRouter).not.toHaveBeenCalled()
		expect(mockCreateProviderRegistry).toHaveBeenCalledWith({ google: googleProvider })
		expect(registry).toEqual({ providers: { google: googleProvider } })
		expect(getAvailableProviderIds()).toEqual(new Set(["google"]))
	})

	it("registers openai and openrouter when their keys are configured", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		process.env.OPENAI_API_KEY = "openai-key"
		process.env.OPENROUTER_API_KEY = "openrouter-key"

		const googleProvider = { providerId: "google" }
		const openaiProvider = { providerId: "openai" }
		const openrouterProvider = { providerId: "openrouter" }
		mockCreateGoogleGenerativeAI.mockReturnValue(googleProvider)
		mockCreateOpenAI.mockReturnValue(openaiProvider)
		mockCreateOpenRouter.mockReturnValue(openrouterProvider)

		const { registry, getAvailableProviderIds } = await loadRegistryModule()

		expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: "openai-key" })
		expect(mockCreateOpenRouter).toHaveBeenCalledWith({ apiKey: "openrouter-key" })
		expect(mockCreateProviderRegistry).toHaveBeenCalledWith({
			google: googleProvider,
			openai: openaiProvider,
			openrouter: openrouterProvider,
		})
		expect(registry).toEqual({
			providers: {
				google: googleProvider,
				openai: openaiProvider,
				openrouter: openrouterProvider,
			},
		})
		expect(getAvailableProviderIds()).toEqual(new Set(["google", "openai", "openrouter"]))
	})

	it("returns an empty set when no provider env vars are configured", async () => {
		process.env.GEMINI_API_KEY = ""
		process.env.OPENAI_API_KEY = ""
		process.env.OPENROUTER_API_KEY = ""

		const { getAvailableProviderIds } = await loadRegistryModule()

		expect(getAvailableProviderIds()).toEqual(new Set())
	})
})

describe("lib/ai/title", () => {
	it("falls back immediately when the internal title provider is not configured", async () => {
		process.env.GEMINI_API_KEY = ""

		const result = await generateTitle("First message title fallback")

		expect(result).toBe("First message title fallback")
		expect(mockLanguageModel).not.toHaveBeenCalled()
		expect(mockGenerateText).not.toHaveBeenCalled()
	})

	it("returns the generated title, trimmed, and resolves model from provider", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		const selectedModel = { modelId: "title-model" }
		mockLanguageModel.mockReturnValue(selectedModel)
		mockGenerateText.mockResolvedValue({ text: "   Title for this chat   " })

		const result = await generateTitle("Please summarize this task")

		expect(result).toBe("Title for this chat")
		expect(mockLanguageModel).toHaveBeenCalledWith("google:gemma-3-4b-it")
		expect(mockGenerateText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: selectedModel,
				prompt: "Please summarize this task",
				abortSignal: expect.any(AbortSignal),
			}),
		)
	})

	it("truncates generated titles to 80 characters", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		mockGenerateText.mockResolvedValue({ text: "x".repeat(120) })

		const result = await generateTitle("Prompt")

		expect(result).toHaveLength(80)
		expect(result).toBe("x".repeat(80))
	})

	it("falls back to a trimmed message excerpt when title generation fails", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		mockGenerateText.mockRejectedValue(new Error("provider timeout"))
		const message = `  ${"a".repeat(120)}  `

		const result = await generateTitle(message)

		expect(result).toBe("a".repeat(80))
	})

	it("falls back to 'New Chat' when both generation and message content are empty", async () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		mockGenerateText.mockResolvedValue({ text: "   " })

		const result = await generateTitle("   ")

		expect(result).toBe("New Chat")
	})
})

describe("lib/ai/internal-models", () => {
	it("throws a clear provider error when an internal model provider is not configured", () => {
		process.env.GEMINI_API_KEY = ""

		expect(() => getInternalLanguageModel("artifact")).toThrowError(
			expect.objectContaining({
				name: AppError.name,
				code: "ai_error:provider:failed",
				message: expect.stringContaining("GEMINI_API_KEY is not configured"),
			}),
		)
		expect(mockLanguageModel).not.toHaveBeenCalled()
	})

	it("resolves configured internal models through myProvider", () => {
		process.env.GEMINI_API_KEY = "gemini-key"
		const selectedModel = { modelId: "artifact-model" }
		mockLanguageModel.mockReturnValue(selectedModel)

		const result = getInternalLanguageModel("artifact")

		expect(result).toBe(selectedModel)
		expect(mockLanguageModel).toHaveBeenCalledWith("google:gemini-2.5-flash-lite")
	})
})

describe("lib/ai/tools", () => {
	it("exports the canonical tool ID list", () => {
		expect(TOOL_IDS).toEqual([
			"getWeather",
			"createArtifact",
			"updateArtifact",
			"requestSuggestions",
		])
	})

	it("returns no enabled tools for models without tool-calling support", () => {
		const model = buildModel({ supportsToolCalling: false })

		expect(getEnabledTools(model)).toEqual([])
	})

	it("returns all tools for models that support tool calling", () => {
		const model = buildModel({ supportsToolCalling: true })

		expect(getEnabledTools(model)).toEqual(TOOL_IDS)
	})
})

describe("lib/ai/artifact-handlers", () => {
	it("registers and returns handlers by artifact kind", async () => {
		const { registerArtifactHandler, getArtifactHandler } = await loadArtifactHandlersModule()
		const textHandler = {
			create: vi.fn(),
			update: vi.fn(),
		}

		registerArtifactHandler("text", textHandler)

		expect(getArtifactHandler("text")).toBe(textHandler)
	})

	it("throws on duplicate handler registration", async () => {
		const { registerArtifactHandler } = await loadArtifactHandlersModule()
		const handler = { create: vi.fn(), update: vi.fn() }
		registerArtifactHandler("code", handler)

		expect(() => registerArtifactHandler("code", handler)).toThrowError(
			'Artifact handler already registered for kind "code"',
		)
	})

	it("throws a typed not-found error when handler does not exist", async () => {
		const { getArtifactHandler } = await loadArtifactHandlersModule()

		try {
			getArtifactHandler("sheet")
			throw new Error("Expected getArtifactHandler to throw")
		} catch (error) {
			expect(error).toMatchObject({
				name: "AppError",
				code: "not_found:artifact:artifact_not_found",
				message: 'No artifact handler registered for kind "sheet"',
			})
		}
	})
})

describe("lib/ai/provider-options", () => {
	it("returns generation options from user settings", () => {
		const result = getProviderOptions("google:gemini-2.5-flash", BASE_SETTINGS)

		expect(result).toEqual({
			temperature: 0.5,
			topP: 0.9,
			maxOutputTokens: 512,
		})
	})

	it("does not include providerOptions when reasoning is disabled", () => {
		const result = getProviderOptions("openai:gpt-4.1", {
			...BASE_SETTINGS,
			enableReasoning: false,
		})

		expect(result.providerOptions).toBeUndefined()
	})

	it("adds Google reasoning options when reasoning is enabled", () => {
		const result = getProviderOptions("google:gemini-2.5-pro", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result.providerOptions).toEqual({
			google: {
				thinkingConfig: {
					thinkingBudget: -1,
				},
			},
		})
	})

	it("adds OpenAI reasoning options when reasoning is enabled", () => {
		const result = getProviderOptions("openai:gpt-4.1", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result.providerOptions).toEqual({
			openai: {
				reasoningEffort: "medium",
			},
		})
	})

	it("adds OpenAI reasoning options for uncataloged reasoning model IDs", () => {
		const result = getProviderOptions("openai:o3-mini", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result.providerOptions).toEqual({
			openai: {
				reasoningEffort: "medium",
			},
		})
	})

	it("does not add reasoning options for static models marked without reasoning", () => {
		const result = getProviderOptions("openai:gpt-4o", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result).toEqual({
			temperature: 0.5,
			topP: 0.9,
			maxOutputTokens: 512,
		})
	})

	it("adds OpenRouter reasoning options when reasoning is enabled", () => {
		const result = getProviderOptions("openrouter:deepseek/deepseek-r1:free", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result.providerOptions).toEqual({
			openrouter: {
				reasoning: {
					max_tokens: 8000,
				},
			},
		})
	})

	it("keeps providerOptions undefined for unknown providers", () => {
		const result = getProviderOptions("custom:model", {
			...BASE_SETTINGS,
			enableReasoning: true,
		})

		expect(result).toEqual({
			temperature: 0.5,
			topP: 0.9,
			maxOutputTokens: 512,
		})
	})
})
