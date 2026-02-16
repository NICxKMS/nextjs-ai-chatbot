/**
 * AI Model Registry
 *
 * Model definitions including IDs, display names, capabilities, and defaults.
 * Provides functions to get models by ID and list available models.
 *
 * @module lib/ai/registry
 */

import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider"
import { experimental_createProviderRegistry as createProviderRegistry } from "ai"
import { availableProviderIds, getProvider, providers } from "./providers"

// =============================================================================
// Model Types
// =============================================================================

/**
 * Model capability flags.
 */
export interface ModelCapabilities {
	/** Supports chat completions */
	chat: boolean
	/** Supports vision/image inputs */
	vision: boolean
	/** Supports function/tool calling */
	tools: boolean
	/** Supports reasoning/chain-of-thought */
	reasoning: boolean
	/** Supports code generation */
	code: boolean
}

/**
 * Model definition with metadata.
 */
export interface ModelDefinition {
	/** Unique model identifier (provider:model format) */
	id: string
	/** Display name for UI */
	name: string
	/** Provider identifier */
	provider: string
	/** Model ID within provider (may differ from id suffix) */
	modelId: string
	/** Maximum output tokens */
	maxTokens: number
	/** Maximum context window */
	contextWindow: number
	/** Model capabilities */
	capabilities: ModelCapabilities
	/** Optional description */
	description?: string
	/** Whether this is a curated/recommended model */
	isCurated?: boolean
	/** Optional tags for categorization */
	tags?: string[]
}

// =============================================================================
// Curated Models
// =============================================================================

/**
 * Curated list of recommended models with their capabilities.
 * Only includes models from available providers.
 */
const curatedModels: ModelDefinition[] = [
	// OpenAI Models
	{
		id: "openai:gpt-4o",
		name: "GPT-4o",
		provider: "openai",
		modelId: "gpt-4o",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Most capable GPT-4 model with vision",
		isCurated: true,
		tags: ["flagship", "multimodal"],
	},
	{
		id: "openai:gpt-4o-mini",
		name: "GPT-4o Mini",
		provider: "openai",
		modelId: "gpt-4o-mini",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Fast and affordable small model",
		isCurated: true,
		tags: ["fast", "affordable"],
	},
	{
		id: "openai:o1",
		name: "o1",
		provider: "openai",
		modelId: "o1",
		maxTokens: 100000,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: false,
			tools: false,
			reasoning: true,
			code: true,
		},
		description: "Advanced reasoning model",
		isCurated: true,
		tags: ["reasoning", "advanced"],
	},

	// Google Models
	{
		id: "google:gemini-2.0-flash",
		name: "Gemini 2.0 Flash",
		provider: "google",
		modelId: "gemini-2.0-flash",
		maxTokens: 8192,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Fast and efficient multimodal model",
		isCurated: true,
		tags: ["fast", "multimodal"],
	},
	{
		id: "google:gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		provider: "google",
		modelId: "gemini-2.5-flash",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description: "Latest Gemini with thinking capabilities",
		isCurated: true,
		tags: ["latest", "multimodal", "reasoning"],
	},
	{
		id: "google:gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		provider: "google",
		modelId: "gemini-2.5-pro",
		maxTokens: 65536,
		contextWindow: 2000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description: "Most capable Gemini model",
		isCurated: true,
		tags: ["flagship", "multimodal", "reasoning"],
	},

	// XAI Models
	{
		id: "xai:grok-2",
		name: "Grok 2",
		provider: "xai",
		modelId: "grok-2",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "XAI's conversational AI",
		isCurated: true,
		tags: ["conversational"],
	},

	// Vercel Gateway Models (via gateway)
	{
		id: "vercel-gateway:openai/gpt-4o",
		name: "GPT-4o (Gateway)",
		provider: "vercel-gateway",
		modelId: "openai/gpt-4o",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "GPT-4o via Vercel AI Gateway",
		isCurated: true,
		tags: ["gateway", "multimodal"],
	},

	// OpenRouter Models
	{
		id: "openrouter:anthropic/claude-3.5-sonnet",
		name: "Claude 3.5 Sonnet",
		provider: "openrouter",
		modelId: "anthropic/claude-3.5-sonnet",
		maxTokens: 8192,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Anthropic's Claude 3.5 Sonnet via OpenRouter",
		isCurated: true,
		tags: ["anthropic", "multimodal"],
	},
]

// =============================================================================
// Provider Registry
// =============================================================================

/**
 * Get available providers as a non-null record.
 * This helper ensures type safety for the provider registry.
 */
function getAvailableProvidersRecord(): Record<string, ProviderV2> {
	const available: Record<string, ProviderV2> = {}
	for (const [id, provider] of Object.entries(providers)) {
		if (provider !== null) {
			available[id] = provider
		}
	}
	return available
}

/**
 * Create provider registry from available providers.
 */
const providerRegistry = createProviderRegistry(getAvailableProvidersRecord())

// =============================================================================
// Model Functions
// =============================================================================

/**
 * Filter models by available providers.
 */
function filterByAvailableProviders(
	models: ModelDefinition[],
): ModelDefinition[] {
	return models.filter((model) =>
		availableProviderIds.includes(model.provider),
	)
}

/**
 * Get all available models.
 * Returns only models from configured providers.
 *
 * @returns Array of available model definitions
 */
export function listModels(): ModelDefinition[] {
	return filterByAvailableProviders(curatedModels)
}

/**
 * Get models filtered by capability.
 *
 * @param capability - Capability to filter by
 * @returns Array of models with the specified capability
 */
export function listModelsByCapability(
	capability: keyof ModelCapabilities,
): ModelDefinition[] {
	return listModels().filter((model) => model.capabilities[capability])
}

/**
 * Get chat-capable models.
 *
 * @returns Array of models suitable for chat
 */
export function listChatModels(): ModelDefinition[] {
	return listModelsByCapability("chat")
}

/**
 * Get a model by its ID.
 *
 * @param id - Model identifier (provider:model format)
 * @returns Model definition or undefined if not found
 */
export function getModelById(id: string): ModelDefinition | undefined {
	return listModels().find((model) => model.id === id)
}

/**
 * Check if a model ID is valid.
 *
 * @param id - Model identifier
 * @returns true if model exists in available models
 */
export function isValidModelId(id: string): boolean {
	return listModels().some((model) => model.id === id)
}

/**
 * Get a language model instance by ID.
 *
 * @param id - Model identifier (provider:model format)
 * @returns Language model instance for use with AI SDK
 *
 * @example
 * ```typescript
 * const model = getModel("openai:gpt-4o")
 * const { text } = await generateText({ model, prompt: "Hello!" })
 * ```
 */
export function getModel(id: string): LanguageModelV2 {
	const definition = getModelById(id)

	if (definition) {
		// Use the provider and modelId from definition
		const provider = getProvider(definition.provider)
		if (provider) {
			return provider.languageModel(definition.modelId) as LanguageModelV2
		}
	}

	// Fallback: try direct resolution through provider registry
	return providerRegistry.languageModel(id as `${string}:${string}`)
}

// =============================================================================
// Default Model Selection
// =============================================================================

/**
 * Default model priority order.
 * First available model from this list becomes the default.
 */
const defaultModelPriority = [
	"google:gemini-2.5-flash",
	"google:gemini-2.0-flash",
	"vercel-gateway:openai/gpt-4o",
	"openai:gpt-4o",
	"openai:gpt-4o-mini",
]

/**
 * Get the default chat model.
 * Returns the first available model from the priority list.
 *
 * @returns Default model definition or undefined if no models available
 */
export function getDefaultChatModel(): ModelDefinition | undefined {
	for (const id of defaultModelPriority) {
		const model = getModelById(id)
		if (model) {
			return model
		}
	}

	// Fallback to first available chat model
	return listChatModels()[0]
}

/**
 * Get the default model for reasoning tasks.
 *
 * @returns Reasoning-capable model or default chat model
 */
export function getReasoningModel(): ModelDefinition | undefined {
	const reasoningPriority = [
		"openai:o1",
		"google:gemini-2.5-pro",
		"google:gemini-2.5-flash",
	]

	for (const id of reasoningPriority) {
		const model = getModelById(id)
		if (model) {
			return model
		}
	}

	// Fallback to any reasoning-capable model
	return listModelsByCapability("reasoning")[0] ?? getDefaultChatModel()
}

/**
 * Get the default model for artifact generation.
 *
 * @returns Model suitable for artifact generation
 */
export function getDefaultArtifactModel(): ModelDefinition | undefined {
	// Prefer models with code and vision capabilities
	const artifactModels = listModels().filter(
		(model) => model.capabilities.code && model.capabilities.vision,
	)

	return artifactModels[0] ?? getDefaultChatModel()
}
