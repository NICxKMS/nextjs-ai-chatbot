/**
 * AI Module
 *
 * Central export point for AI-related utilities including:
 * - Provider configurations (OpenAI, Google, XAI, OpenRouter, Vercel Gateway)
 * - Model registry with capabilities and context windows
 * - Token counting utilities
 * - Context window management
 *
 * @module lib/ai
 */

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

export type {
	ModelCapabilities,
	ModelDefinition,
} from "./registry"
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
