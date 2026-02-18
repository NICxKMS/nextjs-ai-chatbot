/**
 * AI Model Catalog Types
 *
 * Comprehensive type definitions for model metadata, capabilities, and providers.
 * Replaces lossy boolean-flag approach with rich union types and metadata.
 *
 * @module lib/ai/types
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Supported provider identifiers.
 * These are the primary providers supported by the application.
 */
export type ProviderId =
	| "openai"
	| "google"
	| "openrouter"
	| "vercel-gateway"
	| "cloudflare-workers"
	| "cloudflare-ai-gateway"
	| "xai"

/**
 * Human-readable display names for each provider.
 */
export const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string> = {
	openai: "OpenAI",
	google: "Google Gemini",
	openrouter: "OpenRouter",
	"vercel-gateway": "Vercel AI Gateway",
	"cloudflare-workers": "Cloudflare Workers AI",
	"cloudflare-ai-gateway": "Cloudflare AI Gateway",
	xai: "XAI",
}

// =============================================================================
// Model Capability Types
// =============================================================================

/**
 * Model capability identifiers.
 * Union type representing distinct capabilities a model may have.
 */
export type ModelCapability =
	| "chat"
	| "reasoning"
	| "vision"
	| "audio"
	| "multimodal"
	| "code"
	| "tooling"
	| "memory"
	| "image-generation"
	| "video-generation"

/**
 * Input/output modalities supported by a model.
 */
export type ModelModality = "text" | "vision" | "audio"

/**
 * Supported chain-of-thought/reasoning mechanisms by provider.
 * Each provider has a different approach to reasoning/thinking.
 */
export type ReasoningType =
	| "openai-thinking" // OpenAI o1/o3 models - uses thinking tags
	| "anthropic-thinking" // Anthropic Claude extended thinking mode
	| "gemini-thinking" // Google Gemini thinking models
	| "deepseek-thinking" // DeepSeek R1 - uses <think\> tags
	| "internal-thinking" // Generic internal thinking extraction
	| "none" // No explicit chain-of-thought support

// =============================================================================
// Model Metadata Types
// =============================================================================

/**
 * Source of model information.
 * - "curated": Manually curated and verified model
 * - "discovered": Dynamically discovered from provider API
 */
export type ModelSource = "curated" | "discovered"

/**
 * Comprehensive model metadata.
 * Replaces the flat boolean-flag approach with rich typed metadata.
 */
export interface ModelMetadata {
	/** Unique model identifier (provider:model format) */
	id: string
	/** Provider identifier */
	providerId: ProviderId
	/** Human-readable provider name */
	providerName: string
	/** Model ID within provider (may differ from id suffix) */
	modelId: string
	/** Display name for UI */
	name: string
	/** Model description */
	description: string
	/** Release date or version (optional) */
	release?: string
	/** Maximum context window in tokens */
	contextWindow?: number
	/** Maximum output tokens */
	maxOutputTokens?: number
	/** Supported input/output modalities */
	modalities: ModelModality[]
	/** Model capabilities as array of capability identifiers */
	capabilities: ModelCapability[]
	/** Tags for categorization and filtering */
	tags: string[]
	/** Pricing information (optional) */
	price?: string
	/** Source of model information */
	source: ModelSource
	/** Whether this is a curated/recommended model */
	isCurated: boolean
	/** Chain-of-thought/reasoning mechanism type for this model */
	reasoningType?: ReasoningType
	/** Recommended thinking budget (tokens) for reasoning models */
	thinkingBudget?: number
}

// =============================================================================
// Catalog Types (for Dynamic Discovery)
// =============================================================================

/**
 * Provider catalog containing discovered models.
 */
export interface ProviderCatalog {
	/** Provider identifier */
	providerId: ProviderId
	/** Human-readable provider display name */
	displayName: string
	/** Models available from this provider */
	models: ModelMetadata[]
	/** ISO timestamp when catalog was fetched */
	fetchedAt: string
}

/**
 * Response from model catalog discovery.
 * Contains per-provider catalogs and fallback curated models.
 */
export interface ModelCatalogResponse {
	/** Per-provider model catalogs */
	providers: ProviderCatalog[]
	/** Fallback curated models when discovery fails */
	fallback: ModelMetadata[]
	/** ISO timestamp when response was generated */
	fetchedAt: string
}

// =============================================================================
// Legacy Compatibility Types
// =============================================================================

/**
 * Legacy model capabilities interface.
 * Maintained for backward compatibility with existing code.
 * @deprecated Use ModelCapability[] instead for new code.
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
 * Converts ModelCapability array to legacy ModelCapabilities object.
 * Useful for gradual migration from boolean flags to capability arrays.
 *
 * @param capabilities - Array of model capabilities
 * @returns Legacy ModelCapabilities object
 */
export function toLegacyCapabilities(
	capabilities: ModelCapability[],
): ModelCapabilities {
	return {
		chat: capabilities.includes("chat"),
		vision: capabilities.includes("vision"),
		tools: capabilities.includes("tooling"),
		reasoning: capabilities.includes("reasoning"),
		code: capabilities.includes("code"),
	}
}

/**
 * Converts legacy ModelCapabilities object to ModelCapability array.
 * Useful for migrating existing data to the new format.
 *
 * @param capabilities - Legacy ModelCapabilities object
 * @returns Array of ModelCapability values
 */
export function fromLegacyCapabilities(
	capabilities: ModelCapabilities,
): ModelCapability[] {
	const result: ModelCapability[] = []
	if (capabilities.chat) result.push("chat")
	if (capabilities.vision) result.push("vision")
	if (capabilities.tools) result.push("tooling")
	if (capabilities.reasoning) result.push("reasoning")
	if (capabilities.code) result.push("code")
	return result
}
