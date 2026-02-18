/**
 * AI Model Configuration Constants
 *
 * Centralized configuration for AI model defaults, limits, and behavior.
 * Import from @/lib/ai/constants for consistent values across the codebase.
 *
 * @module lib/ai/constants
 */

// =============================================================================
// Default Model Configuration
// =============================================================================

/**
 * Default model ID when no user preference is set.
 * Uses GPT-4o Mini as a fast, capable default.
 */
export const DEFAULT_MODEL_ID = "openai:gpt-4o-mini"

/**
 * Default temperature for model responses.
 * 0.7 provides a good balance between creativity and consistency.
 */
export const DEFAULT_TEMPERATURE = 0.7

/**
 * Default maximum output tokens for model responses.
 * 4096 tokens is sufficient for most responses while leaving context for input.
 */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096

/**
 * Default top P sampling value.
 * 0.95 allows for diverse responses while avoiding very low probability tokens.
 */
export const DEFAULT_TOP_P = 0.95

// =============================================================================
// Token Limits
// =============================================================================

/**
 * Maximum context window size in tokens.
 * This is the largest context window among supported models.
 */
export const MAX_CONTEXT_TOKENS = 128_000

/**
 * Tokens reserved for system prompt.
 * Ensures system prompts don't consume too much of the context window.
 */
export const SYSTEM_PROMPT_RESERVE_TOKENS = 2000

/**
 * Maximum tokens for chat title generation.
 * Titles should be concise, so 80 tokens is sufficient.
 */
export const TITLE_GENERATION_MAX_TOKENS = 80

// =============================================================================
// Model Cache Configuration
// =============================================================================

/**
 * Time-to-live for model list cache in milliseconds.
 * 1 hour provides a good balance between freshness and performance.
 */
export const MODEL_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Timeout for provider model discovery in milliseconds.
 * 5 seconds is reasonable for API calls to return available models.
 */
export const MODEL_DISCOVERY_TIMEOUT_MS = 5000

// =============================================================================
// Rate Limiting Defaults
// =============================================================================

/**
 * Default messages per minute rate limit.
 */
export const DEFAULT_MESSAGES_PER_MINUTE = 20

/**
 * Default tokens per minute rate limit.
 */
export const DEFAULT_TOKENS_PER_MINUTE = 100_000

// =============================================================================
// Streaming Configuration
// =============================================================================

/**
 * Size of stream chunks in bytes.
 */
export const STREAM_CHUNK_SIZE = 1024

/**
 * Timeout for stream responses in milliseconds.
 * 30 seconds allows for longer responses without hanging indefinitely.
 */
export const STREAM_TIMEOUT_MS = 30_000

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Supported provider IDs.
 * These are the primary providers supported by the application.
 */
export const SUPPORTED_PROVIDERS = [
	"openai",
	"anthropic",
	"google",
	"xai",
	"openrouter",
	"gateway",
] as const

/**
 * Type for supported provider IDs.
 */
export type SupportedProviderId = (typeof SUPPORTED_PROVIDERS)[number]

// =============================================================================
// Model Categories
// =============================================================================

/**
 * Model categories for UI display and filtering.
 */
export const MODEL_CATEGORIES = {
	RECOMMENDED: "Recommended",
	CHAT: "Chat",
	REASONING: "Reasoning",
	CODING: "Coding",
	VISION: "Vision",
} as const

/**
 * Type for model category keys.
 */
export type ModelCategoryKey = keyof typeof MODEL_CATEGORIES

/**
 * Type for model category values.
 */
export type ModelCategoryValue = (typeof MODEL_CATEGORIES)[ModelCategoryKey]
