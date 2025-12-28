/**
 * AI Model Configuration Constants
 *
 * Centralized configuration for AI model defaults, limits, and behavior.
 * Import from @/lib/ai/constants for consistent values across the codebase.
 */

/**
 * Default Model Configuration
 */
export const DEFAULT_MODEL_ID = "openai:gpt-4o-mini"; // Fallback when no user preference
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
export const DEFAULT_TOP_P = 0.95;

/**
 * Token Limits
 */
export const MAX_CONTEXT_TOKENS = 128_000; // Maximum context window
export const SYSTEM_PROMPT_RESERVE_TOKENS = 2000; // Reserved for system prompt
export const TITLE_GENERATION_MAX_TOKENS = 80; // For chat title generation

/**
 * Model Cache Configuration
 */
export const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for model list cache
export const MODEL_DISCOVERY_TIMEOUT_MS = 5000; // Timeout for provider model discovery

/**
 * Rate Limiting Defaults
 */
export const DEFAULT_MESSAGES_PER_MINUTE = 20;
export const DEFAULT_TOKENS_PER_MINUTE = 100_000;

/**
 * Streaming Configuration
 */
export const STREAM_CHUNK_SIZE = 1024; // Bytes per stream chunk
export const STREAM_TIMEOUT_MS = 30_000; // 30 second timeout for stream responses

/**
 * Supported Provider IDs
 * These are the primary providers supported by the application
 */
export const SUPPORTED_PROVIDERS = [
    "openai",
    "anthropic",
    "google",
    "xai",
    "openrouter",
    "gateway",
] as const;

export type SupportedProviderId = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Model Categories for UI Display
 */
export const MODEL_CATEGORIES = {
    RECOMMENDED: "Recommended",
    CHAT: "Chat",
    REASONING: "Reasoning",
    CODING: "Coding",
    VISION: "Vision",
} as const;
