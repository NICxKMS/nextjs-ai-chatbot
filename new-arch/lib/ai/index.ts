"use server";

/**
 * AI Integration Module
 * @module new-arch/lib/ai
 *
 * Server-only AI provider integration with multi-provider support,
 * streaming completions, and tool execution.
 *
 * @example
 * ```ts
 * import { DEFAULT_CHAT_MODEL_ID, AI_COMPLETION_TIMEOUT_MS } from '@/lib/ai';
 * import type { ModelConfig, ToolContext, AIProviderId } from '@/lib/ai';
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
    AIProviderConfig,
    // Provider types
    AIProviderId,
    // Client-safe types
    ChatModelInfo,
    CompletionResult,
    CompletionSettings,
    // Model capability types
    ModelCapability,
    ModelCapabilityFlags,
    ModelCatalogResponse,
    // Model configuration types
    ModelConfig,
    ModelModality,
    ModelSelectionCriteria,
    ModelSource,
    ProviderCatalog,
    ProviderHealth,
    ProviderHealthStatus,
    ReasoningType,
    // Completion types
    RequestHints,
    SamplingConfig,
    TokenUsage,
    // Tool context types
    ToolContext,
    ToolId,
} from "./types";

// ============================================================================
// Constant Exports
// ============================================================================

export {
    // Timeout configuration
    AI_COMPLETION_TIMEOUT_MS,
    // Provider configuration
    AI_PROVIDER_CONFIGS,
    // Telemetry configuration
    AI_TELEMETRY_CONFIG,
    // Model defaults
    DEFAULT_CHAT_MODEL_ID,
    DEFAULT_CONTEXT_WINDOW,
    DEFAULT_MAX_OUTPUT_TOKENS,
    // Provider-specific options
    DEFAULT_OPENAI_REASONING_EFFORT,
    DEFAULT_PROVIDER_PRIORITY,
    DEFAULT_THINKING_BUDGETS,
    FALLBACK_CHAT_MODEL_ID,
    MAX_TOOL_STEPS,
    MODEL_CATALOG_REFRESH_INTERVAL_MS,
    PROVIDER_HEALTH_CHECK_TIMEOUT_MS,
    REASONING_PROVIDER_OPTIONS,
    // Reasoning configuration
    REASONING_TAG_MAP,
    // Streaming configuration
    SMOOTH_STREAM_CONFIG,
    TOOL_REQUIRED_CAPABILITIES,
    // Tool configuration
    TOOL_UNSUPPORTED_MODEL_PATTERNS,
} from "./config";
export {
    // Provider display names
    AI_PROVIDER_DISPLAY_NAMES,
    // Tool IDs
    TOOL_IDS,
} from "./types";

// ============================================================================
// Function Exports
// ============================================================================

export {
    getConfiguredProviderIds,
    // Environment helpers
    hasProviderEnvVars,
    isTestEnvironment,
    shouldUseMockProvider,
} from "./config";
export type { Entitlements, UserType } from "./entitlements";
export {
    canAccessModel,
    entitlementsByUserType,
    getEntitlements,
    getMaxMessagesPerDay,
    // Entitlements
    getModelEntitlements,
} from "./entitlements";
