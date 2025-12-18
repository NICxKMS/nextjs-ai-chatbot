"use server";

/**
 * AI Integration Types
 * @module new-arch/lib/ai/types
 *
 * Core type definitions for AI provider integration, model capabilities,
 * and tool execution context.
 */

import type { AppSession } from "../auth/types";

// ============================================================================
// Provider Types
// ============================================================================

/** Supported AI provider identifiers */
export type AIProviderId =
    | "openai"
    | "anthropic"
    | "google"
    | "openrouter"
    | "vercel-gateway"
    | "cloudflare-workers"
    | "cloudflare-ai-gateway";

/** Provider display name mapping */
export const AI_PROVIDER_DISPLAY_NAMES: Readonly<Record<AIProviderId, string>> =
    {
        openai: "OpenAI",
        anthropic: "Anthropic",
        google: "Google Gemini",
        openrouter: "OpenRouter",
        "vercel-gateway": "Vercel AI Gateway",
        "cloudflare-workers": "Cloudflare Workers AI",
        "cloudflare-ai-gateway": "Cloudflare AI Gateway",
    } as const;

/** Provider configuration for lazy initialization */
export type AIProviderConfig = {
    readonly id: AIProviderId;
    readonly envVars: readonly string[];
    readonly displayName: string;
};

/** Provider health status */
export type ProviderHealthStatus = "healthy" | "degraded" | "unavailable";

/** Provider health information */
export type ProviderHealth = {
    readonly providerId: AIProviderId;
    readonly status: ProviderHealthStatus;
    readonly lastCheck: Date;
    readonly latencyMs?: number;
    readonly errorRate?: number;
};

// ============================================================================
// Model Capability Types
// ============================================================================

/** Model capability flags */
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
    | "video-generation";

/** Model input/output modalities */
export type ModelModality = "text" | "vision" | "audio";

/** Reasoning mechanism type by provider */
export type ReasoningType =
    | "openai-thinking" // OpenAI o1/o3 models
    | "anthropic-thinking" // Anthropic Claude extended thinking
    | "gemini-thinking" // Google Gemini thinking models
    | "deepseek-thinking" // DeepSeek R1 <think> tags
    | "internal-thinking" // Generic internal thinking
    | "none"; // No chain-of-thought support

/** Model data source indicator */
export type ModelSource = "curated" | "discovered";

// ============================================================================
// Model Configuration Types
// ============================================================================

/** Complete model metadata */
export type ModelConfig = {
    /** Unique identifier (providerId:modelId format) */
    readonly id: string;
    /** Provider identifier */
    readonly providerId: AIProviderId;
    /** Provider display name */
    readonly providerName: string;
    /** Provider-specific model identifier */
    readonly modelId: string;
    /** Human-readable model name */
    readonly name: string;
    /** Model description */
    readonly description: string;
    /** Release date/version */
    readonly release?: string;
    /** Context window size in tokens */
    readonly contextWindow?: number;
    /** Maximum output tokens */
    readonly maxOutputTokens?: number;
    /** Supported input modalities */
    readonly modalities: readonly ModelModality[];
    /** Model capabilities */
    readonly capabilities: readonly ModelCapability[];
    /** Categorization tags */
    readonly tags: readonly string[];
    /** Pricing information */
    readonly price?: string;
    /** Data source */
    readonly source: ModelSource;
    /** Whether model is in curated list */
    readonly isCurated: boolean;
    /** Reasoning mechanism type */
    readonly reasoningType?: ReasoningType;
    /** Recommended thinking budget for reasoning models */
    readonly thinkingBudget?: number;
};

/** Model selection criteria */
export type ModelSelectionCriteria = {
    /** Any of these capabilities (OR) */
    capabilities?: ModelCapability[];
    /** Must have ALL these capabilities (AND) */
    requiredCapabilities?: ModelCapability[];
    /** Preferred providers in priority order */
    preferredProviders?: AIProviderId[];
    /** Maximum context window size */
    maxContextWindow?: number;
    /** Exclude pure reasoning models */
    excludeReasoning?: boolean;
};

/** Provider catalog containing models */
export type ProviderCatalog = {
    readonly providerId: AIProviderId;
    readonly displayName: string;
    readonly models: readonly ModelConfig[];
    readonly fetchedAt: string;
};

/** Complete model catalog response */
export type ModelCatalogResponse = {
    readonly providers: readonly ProviderCatalog[];
    readonly fallback: readonly ModelConfig[];
    readonly fetchedAt: string;
};

// ============================================================================
// Tool Context Types
// ============================================================================

/**
 * Tool execution context - injected into all tools
 *
 * Note: DataStream is typed as `unknown` to avoid coupling to specific
 * UIMessage implementations. Concrete implementations should use the
 * appropriate ChatMessage type from lib/types.ts.
 */
export type ToolContext<TDataStream = unknown> = {
    /** Current user session */
    readonly session: AppSession;
    /** Data stream writer for real-time updates */
    readonly dataStream: TDataStream;
    /** Current chat identifier */
    readonly chatId: string;
};

/** Supported tool identifiers */
export type ToolId =
    | "getWeather"
    | "createDocument"
    | "updateDocument"
    | "requestSuggestions";

/** All supported tool IDs */
export const TOOL_IDS: readonly ToolId[] = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
] as const;

// ============================================================================
// Completion Types
// ============================================================================

/** Request hints for prompt customization */
export type RequestHints = {
    readonly city?: string;
    readonly country?: string;
    readonly timezone?: string;
};

/** Sampling configuration for model generation */
export type SamplingConfig = {
    readonly temperature?: number;
    readonly topP?: number;
    readonly maxOutputTokens?: number;
};

/** Completion settings */
export type CompletionSettings = {
    /** Custom system prompt */
    readonly systemPrompt?: string;
    /** Sampling parameters */
    readonly sampling?: SamplingConfig;
};

/** Token usage information */
export type TokenUsage = {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
};

/** Completion result summary */
export type CompletionResult = {
    readonly success: boolean;
    readonly usage?: TokenUsage;
    readonly finishReason?: string;
    readonly error?: string;
};

// ============================================================================
// Client-Safe Types (no runtime code, safe for client import)
// ============================================================================

/** Simplified model info for client display */
export type ChatModelInfo = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
};

/** Model capability flags for client UI */
export type ModelCapabilityFlags = {
    readonly chat: boolean;
    readonly reasoning: boolean;
    readonly vision: boolean;
    readonly tooling: boolean;
};
