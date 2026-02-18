/**
 * AI Module
 *
 * Central export point for AI-related utilities including:
 * - Provider configurations (OpenAI, Google, XAI, OpenRouter, Vercel Gateway)
 * - Model registry with capabilities and context windows
 * - Token counting utilities
 * - Context window management
 * - AI configuration constants
 * - Model catalog types for comprehensive metadata
 * - System prompts for chat and artifact generation
 *
 * @module lib/ai
 */

// =============================================================================
// Constants Exports
// =============================================================================

export type {
	ModelCategoryKey,
	ModelCategoryValue,
	SupportedProviderId,
} from "./constants"
export {
	DEFAULT_MAX_OUTPUT_TOKENS,
	DEFAULT_MESSAGES_PER_MINUTE,
	DEFAULT_MODEL_ID,
	DEFAULT_TEMPERATURE,
	DEFAULT_TOKENS_PER_MINUTE,
	DEFAULT_TOP_P,
	MAX_CONTEXT_TOKENS,
	MODEL_CACHE_TTL_MS,
	MODEL_CATEGORIES,
	MODEL_DISCOVERY_TIMEOUT_MS,
	STREAM_CHUNK_SIZE,
	STREAM_TIMEOUT_MS,
	SUPPORTED_PROVIDERS,
	SYSTEM_PROMPT_RESERVE_TOKENS,
	TITLE_GENERATION_MAX_TOKENS,
} from "./constants"

// =============================================================================
// Type Exports (from types.ts)
// =============================================================================

export type {
	ModelCapabilities,
	ModelCapability,
	ModelCatalogResponse,
	ModelMetadata,
	ModelModality,
	ModelSource,
	ProviderCatalog,
	ProviderId,
	ReasoningType,
} from "./types"
export {
	fromLegacyCapabilities,
	PROVIDER_DISPLAY_NAMES,
	toLegacyCapabilities,
} from "./types"

// =============================================================================
// Provider Exports
// =============================================================================

export {
	availableProviderIds,
	getDefaultProvider,
	getProvider,
	google,
	isProviderAvailable,
	openai,
	openrouter,
	providers,
	vercelGateway,
	xai,
} from "./providers"

// =============================================================================
// Registry Exports
// =============================================================================

export type { ModelDefinition } from "./registry"
export {
	getDefaultArtifactModel,
	getDefaultChatModel,
	getModel,
	getModelById,
	getReasoningModel,
	isValidModelId,
	listChatModels,
	listModels,
	listModelsByCapability,
} from "./registry"

// =============================================================================
// Token Counter Exports
// =============================================================================

export type { TokenBudget } from "./token-counter"
export {
	calculateTokenBudget,
	countMessagesTokens,
	countMessageTokens,
	countTokens,
	countToolsTokens,
	estimateTokens,
} from "./token-counter"

// =============================================================================
// Context Window Exports
// =============================================================================

export type {
	ContextMessage,
	ContextWindowConfig,
	TruncationResult,
	TruncationStrategy,
	ValidateContextOptions,
} from "./context-window"
export {
	calculateMessagesToFit,
	getContextStats,
	getContextWindowSize,
	getDefaultContextConfig,
	getMaxOutputTokens,
	getTokenBudget,
	truncateMessages,
	validateContext,
} from "./context-window"

// =============================================================================
// Prompts Exports
// =============================================================================

export type {
	ArtifactKindForPrompt,
	RequestHints,
	SystemPromptOptions,
} from "./prompts"
export {
	artifactsPrompt,
	codePrompt,
	getCodeUpdatePrompt,
	getRequestPromptFromHints,
	getSheetUpdatePrompt,
	getTextUpdatePrompt,
	regularPrompt,
	sheetPrompt,
	systemPrompt,
	textPrompt,
	updateDocumentPrompt,
} from "./prompts"

// =============================================================================
// Chat Completion Exports
// =============================================================================

export type {
	AppUsage,
	ChatCompletionParams,
	ChatMessage,
	ChatSettings,
	CustomUIDataTypes,
	MessageMetadata,
	UsageData,
} from "./chat-completion"
export {
	buildProviderOptions,
	executeChatCompletion,
	getEnabledTools,
} from "./chat-completion"

// =============================================================================
// Title Generation Exports
// =============================================================================

export {
	generatePlaceholderTitle,
	generateTitleFromUserMessage,
} from "./title-generation"

// =============================================================================
// Model Discovery Exports
// =============================================================================

export type { DiscoveryOptions, DiscoveryResult } from "./model-discovery"
export {
	clearModelCache,
	discoverCloudflareWorkers,
	discoverGoogleGemini,
	discoverOpenAI,
	discoverOpenRouter,
	discoverProviders,
	forceRefreshModelCatalog,
	getModelCatalog,
	listProviderCatalogs,
	refreshModelCatalog,
} from "./model-discovery"
