"use server";

/**
 * AI Configuration
 * @module new-arch/lib/ai/config
 *
 * AI provider configuration, model defaults, and runtime settings.
 * Server-only module - no client bundle pollution.
 */

import type {
    AIProviderConfig,
    AIProviderId,
    ModelCapability,
    ReasoningType,
} from "./types";

// ============================================================================
// Provider Configuration
// ============================================================================

/** Provider configurations with required environment variables */
export const AI_PROVIDER_CONFIGS: readonly AIProviderConfig[] = [
    {
        id: "openai",
        envVars: ["OPENAI_API_KEY"],
        displayName: "OpenAI",
    },
    {
        id: "google",
        envVars: ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
        displayName: "Google Gemini",
    },
    {
        id: "openrouter",
        envVars: ["OPENROUTER_API_KEY"],
        displayName: "OpenRouter",
    },
    {
        id: "vercel-gateway",
        envVars: ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"],
        displayName: "Vercel AI Gateway",
    },
    {
        id: "cloudflare-workers",
        envVars: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
        displayName: "Cloudflare Workers AI",
    },
    {
        id: "cloudflare-ai-gateway",
        envVars: ["CLOUDFLARE_AI_GATEWAY_ID", "CLOUDFLARE_ACCOUNT_ID"],
        displayName: "Cloudflare AI Gateway",
    },
] as const;

/** Default provider priority for model selection */
export const DEFAULT_PROVIDER_PRIORITY: readonly AIProviderId[] = [
    "google",
    "vercel-gateway",
    "openai",
    "openrouter",
    "cloudflare-workers",
    "cloudflare-ai-gateway",
] as const;

// ============================================================================
// Timeout Configuration
// ============================================================================

/** AI completion timeout in milliseconds (55s, before 60s route max) */
export const AI_COMPLETION_TIMEOUT_MS = 55_000;

/** Provider health check timeout */
export const PROVIDER_HEALTH_CHECK_TIMEOUT_MS = 5000;

/** Model catalog refresh interval (24 hours) */
export const MODEL_CATALOG_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Streaming Configuration
// ============================================================================

/** Smooth stream configuration */
export const SMOOTH_STREAM_CONFIG = {
    /** Delay between chunks in milliseconds */
    delayInMs: 2,
    /** Chunking strategy */
    chunking: "word" as const,
} as const;

/** Maximum tool execution steps per completion */
export const MAX_TOOL_STEPS = 5;

// ============================================================================
// Model Defaults
// ============================================================================

/** Default model ID when no preference specified */
export const DEFAULT_CHAT_MODEL_ID = "google:gemini-2.5-flash-preview-05-20";

/** Fallback model ID if default unavailable */
export const FALLBACK_CHAT_MODEL_ID = "openai:gpt-4o-mini";

/** Default context window assumption */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Default max output tokens */
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// ============================================================================
// Reasoning Configuration
// ============================================================================

/** Reasoning tag mapping for middleware extraction */
export const REASONING_TAG_MAP: Readonly<Record<ReasoningType, string>> = {
    "openai-thinking": "think",
    "anthropic-thinking": "thinking",
    "gemini-thinking": "think",
    "deepseek-thinking": "think",
    "internal-thinking": "think",
    none: "",
} as const;

/** Default thinking budget for reasoning models (tokens) */
export const DEFAULT_THINKING_BUDGETS: Readonly<
    Partial<Record<ReasoningType, number>>
> = {
    "openai-thinking": 8000,
    "anthropic-thinking": 8000,
    "gemini-thinking": 1024,
    "deepseek-thinking": 6000,
    "internal-thinking": 6000,
} as const;

// ============================================================================
// Tool Configuration
// ============================================================================

/** Models that don't support tools */
export const TOOL_UNSUPPORTED_MODEL_PATTERNS: readonly string[] = [
    "gemma-", // Google Gemma models
    "o1-", // OpenAI o1 reasoning-only models
    "o3-", // OpenAI o3 reasoning-only models
] as const;

/** Capabilities required for tool usage */
export const TOOL_REQUIRED_CAPABILITIES: readonly ModelCapability[] = [
    "tooling",
] as const;

// ============================================================================
// Provider-Specific Options
// ============================================================================

/** OpenAI reasoning effort levels */
export type OpenAIReasoningEffort = "low" | "medium" | "high";

/** Default reasoning effort for OpenAI models */
export const DEFAULT_OPENAI_REASONING_EFFORT: OpenAIReasoningEffort = "high";

/** Provider options builders by reasoning type */
export const REASONING_PROVIDER_OPTIONS: Readonly<
    Record<ReasoningType, Record<string, unknown>>
> = {
    "openai-thinking": {
        openai: { reasoningEffort: DEFAULT_OPENAI_REASONING_EFFORT },
    },
    "anthropic-thinking": {
        anthropic: {
            thinkingBudget: DEFAULT_THINKING_BUDGETS["anthropic-thinking"],
        },
    },
    "gemini-thinking": {
        google: {
            thinkingConfig: {
                type: "enabled",
                includeThoughts: true,
                budgetTokens: DEFAULT_THINKING_BUDGETS["gemini-thinking"],
            },
        },
    },
    "deepseek-thinking": {
        deepseek: { reasoningLevel: "high" },
    },
    "internal-thinking": {
        reasoning: {
            enabled: true,
            budget: DEFAULT_THINKING_BUDGETS["internal-thinking"],
        },
    },
    none: {},
} as const;

// ============================================================================
// Telemetry Configuration
// ============================================================================

/** Telemetry settings for AI completions */
export const AI_TELEMETRY_CONFIG = {
    isEnabled: true,
    functionId: "chat-stream-text",
    recordInputs: true,
    recordOutputs: true,
} as const;

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Check if any provider environment variable is configured
 */
export function hasProviderEnvVars(config: AIProviderConfig): boolean {
    return config.envVars.some((envVar) => Boolean(process.env[envVar]));
}

/**
 * Get configured providers based on environment
 */
export function getConfiguredProviderIds(): AIProviderId[] {
    return AI_PROVIDER_CONFIGS.filter(hasProviderEnvVars).map(
        (config) => config.id
    );
}

/**
 * Check if running in test environment
 */
export function isTestEnvironment(): boolean {
    return (
        process.env.NODE_ENV === "test" ||
        process.env.PLAYWRIGHT_TEST === "true" ||
        Boolean(process.env.CI)
    );
}

/**
 * Check if mock provider should be used
 */
export function shouldUseMockProvider(): boolean {
    return isTestEnvironment() || process.env.USE_MOCK_AI === "true";
}
