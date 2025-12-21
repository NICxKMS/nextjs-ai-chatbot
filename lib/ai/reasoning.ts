/**
 * AI Reasoning Middleware & Provider Options
 * Ref: 05-ai-integration-optimal-design.md §4
 *
 * Provides reasoning model support including:
 * - Provider-specific options for reasoning models
 * - Reasoning middleware for chain-of-thought extraction
 * - ReasoningType detection and tag name mapping
 *
 * @module lib/ai/reasoning
 */

import {
    extractReasoningMiddleware,
    wrapLanguageModel,
    type LanguageModel,
} from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import { MODEL_REGISTRY } from "./models";

// =============================================================================
// REASONING TYPES
// =============================================================================

/**
 * Supported chain-of-thought/reasoning mechanisms by provider
 */
export type ReasoningType =
    | "openai-thinking" // OpenAI o1/o3/gpt-4.1 models - uses thinking tags
    | "anthropic-thinking" // Anthropic Claude extended thinking mode
    | "gemini-thinking" // Google Gemini thinking models
    | "deepseek-thinking" // DeepSeek R1 - uses <think> tags
    | "internal-thinking" // Generic internal thinking extraction
    | "none"; // No explicit chain-of-thought support

// =============================================================================
// REASONING TAG MAPPING
// =============================================================================

/**
 * Maps reasoning types to the appropriate tag names for chain-of-thought extraction.
 * This ensures the Vercel AI SDK's extractReasoningMiddleware correctly identifies
 * the reasoning/thinking tags from different providers.
 *
 * Reference: https://sdk.vercel.ai/docs/reference/reasoning
 */
function getReasoningTagName(reasoningType: ReasoningType): string {
    switch (reasoningType) {
        case "openai-thinking":
            // OpenAI o1/o3 models use <think> tags in their response
            return "think";
        case "anthropic-thinking":
            // Claude with extended thinking mode uses <thinking> tags
            return "thinking";
        case "gemini-thinking":
            // Google Gemini thinking models use <think> tags
            return "think";
        case "deepseek-thinking":
            // DeepSeek R1 uses <think> tags
            return "think";
        case "internal-thinking":
            // Generic internal thinking extraction
            return "think";
        default:
            return "think"; // Fallback to generic tag
    }
}

// =============================================================================
// REASONING TYPE DETECTION
// =============================================================================

/**
 * Map of model ID patterns to their reasoning types
 * Used when model metadata doesn't explicitly specify reasoningType
 */
const REASONING_MODEL_PATTERNS: Record<string, ReasoningType> = {
    // OpenAI reasoning models
    "openai:o1": "openai-thinking",
    "openai:o1-preview": "openai-thinking",
    "openai:o1-mini": "openai-thinking",
    "openai:o3": "openai-thinking",
    "openai:o3-mini": "openai-thinking",
    "openai:gpt-4.1": "openai-thinking",

    // Google reasoning models
    "google:gemini-2.5-pro": "gemini-thinking",
    "google:gemini-2.5-flash": "gemini-thinking",
    "google:gemini-2.5-flash-lite": "gemini-thinking",
    "google:gemini-3.0-pro-preview": "gemini-thinking",

    // Anthropic (via OpenRouter typically)
    "openrouter:anthropic/claude-3.7-sonnet": "anthropic-thinking",
    "openrouter:anthropic/claude-3.5-opus": "anthropic-thinking",

    // DeepSeek reasoning models
    "openrouter:deepseek/deepseek-r1:free": "deepseek-thinking",
    "openrouter:deepseek/deepseek-chat:free": "deepseek-thinking",

    // Cloudflare AI Gateway models
    "cloudflare-ai-gateway:gemini-2.5-flash": "gemini-thinking",
    "cloudflare-ai-gateway:gemini-2.5-flash-lite": "gemini-thinking",
};

/**
 * Get the reasoning type for a model
 * First checks the model registry, then falls back to pattern matching
 */
export function getReasoningType(modelId: string): ReasoningType {
    // Check if model supports reasoning from registry
    const metadata = MODEL_REGISTRY[modelId];
    if (metadata?.capabilities?.supportsReasoning) {
        // Check pattern matching for specific reasoning type
        const patternMatch = REASONING_MODEL_PATTERNS[modelId];
        if (patternMatch) {
            return patternMatch;
        }

        // Infer from provider
        const provider = metadata.provider;
        switch (provider) {
            case "openai":
                return "openai-thinking";
            case "google":
            case "cloudflare-ai-gateway":
                return "gemini-thinking";
            case "anthropic":
                return "anthropic-thinking";
            case "openrouter":
                // Check for known OpenRouter patterns
                if (
                    modelId.includes("deepseek") &&
                    modelId.includes("r1")
                ) {
                    return "deepseek-thinking";
                }
                if (modelId.includes("anthropic/claude-3.7")) {
                    return "anthropic-thinking";
                }
                return "internal-thinking";
            default:
                return "internal-thinking";
        }
    }

    return "none";
}

/**
 * Check if a model supports reasoning
 */
export function isReasoningModel(modelId: string): boolean {
    return getReasoningType(modelId) !== "none";
}

// =============================================================================
// PROVIDER OPTIONS
// =============================================================================

/**
 * Default thinking budgets per provider type
 */
const DEFAULT_THINKING_BUDGETS: Record<ReasoningType, number> = {
    "openai-thinking": 0, // OpenAI uses reasoningEffort, not token budget
    "anthropic-thinking": 8000,
    "gemini-thinking": 1024,
    "deepseek-thinking": 8000,
    "internal-thinking": 4000,
    none: 0,
};

// Type for JSON-compatible values
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
type ProviderOptionsType = Record<string, Record<string, JSONValue>>;

/**
 * Build provider-specific options for reasoning models
 *
 * Different providers require different configuration for reasoning/thinking modes:
 * - OpenAI: Uses `reasoningEffort` parameter ('low', 'medium', 'high')
 * - Anthropic: Uses `thinkingBudget` token count
 * - Google: Uses `thinkingConfig` with type and budgetTokens
 *
 * @param modelId - The model identifier
 * @param thinkingBudget - Optional custom thinking budget (in tokens)
 * @returns Provider-specific options record, empty if not a reasoning model
 */
export function buildProviderOptions(
    modelId: string,
    thinkingBudget?: number
): ProviderOptionsType {
    const reasoningType = getReasoningType(modelId);

    if (reasoningType === "none") {
        return {};
    }

    const budget = thinkingBudget ?? DEFAULT_THINKING_BUDGETS[reasoningType];
    const metadata = MODEL_REGISTRY[modelId];
    const provider = metadata?.provider ?? "";

    switch (reasoningType) {
        case "openai-thinking":
            // OpenAI o1/o3/gpt-4.1 models use reasoningEffort
            return {
                openai: {
                    reasoningEffort: "high",
                },
            };

        case "anthropic-thinking":
            // Anthropic Claude extended thinking uses thinkingBudget
            return {
                anthropic: {
                    thinkingBudget: budget,
                },
            };

        case "gemini-thinking":
            // Google Gemini uses thinkingConfig with type, includeThoughts, and budgetTokens
            // Ref: OldApp chat-completion.ts - matches exact OldApp structure
            return {
                google: {
                    thinkingConfig: {
                        type: "enabled",
                        includeThoughts: true,
                        budgetTokens: budget,
                    },
                },
            };

        case "deepseek-thinking":
            // DeepSeek R1 uses reasoningLevel parameter
            // Ref: OldApp chat-completion.ts
            return {
                deepseek: {
                    reasoningLevel: "high",
                },
            };

        case "internal-thinking":
            // Generic thinking with enabled flag and budget
            // Ref: OldApp chat-completion.ts
            return {
                reasoning: {
                    enabled: true,
                    budget: budget,
                },
            };

        default:
            return {};
    }
}

// =============================================================================
// REASONING MIDDLEWARE
// =============================================================================

/**
 * Wrap a language model with reasoning extraction middleware
 *
 * The middleware extracts chain-of-thought reasoning from the model's response
 * by looking for specific tags (e.g., <think>, <thinking>) and separating
 * the reasoning from the final answer.
 *
 * @param model - The language model to wrap
 * @param modelId - The model identifier (used to determine reasoning type)
 * @returns The wrapped model (or original if not a reasoning model)
 */
export function wrapWithReasoningMiddleware(
    model: LanguageModel,
    modelId: string
): LanguageModel {
    const reasoningType = getReasoningType(modelId);

    if (reasoningType === "none") {
        return model;
    }

    const tagName = getReasoningTagName(reasoningType);

    // wrapLanguageModel expects LanguageModelV2, which is the underlying type
    // The type assertion chain is safe as we're wrapping a valid LanguageModel
    const wrappedModel = wrapLanguageModel({
        model: model as LanguageModelV2,
        middleware: extractReasoningMiddleware({ tagName }),
    });
    
    return wrappedModel as unknown as LanguageModel;
}
