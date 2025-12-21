/**
 * AI Model Registry
 * Ref: 05-ai-integration-optimal-design.md §3
 *
 * Central registry of available AI models with their metadata and capabilities.
 *
 * @module lib/ai/models
 */

import type { ModelMetadata } from "@/features/chat/types";

/**
 * Registry of all available AI models
 * Models are keyed by their unique identifier
 */
export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
    "gpt-4o": {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        description: "Most capable OpenAI model",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "gpt-4o-mini": {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        description: "Fast and affordable",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "claude-3-5-sonnet-20241022": {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        description: "Best for coding and analysis",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 200_000,
        },
    },
    "gemini-2.0-flash-exp": {
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash",
        provider: "google",
        description: "Fast multimodal model from Google",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 1_048_576,
        },
    },
} as const;

/**
 * Default model to use when none is specified
 */
export const DEFAULT_MODEL_ID = "gpt-4o-mini";

/**
 * Get all available models as an array
 */
export function getAvailableModels(): ModelMetadata[] {
    return Object.values(MODEL_REGISTRY);
}

/**
 * Get a model by its ID
 * @param id - The model identifier
 * @returns The model metadata or undefined if not found
 */
export function getModelById(id: string): ModelMetadata | undefined {
    return MODEL_REGISTRY[id];
}

/**
 * Check if a model ID is valid
 * @param id - The model identifier to check
 */
export function isValidModel(id: string): boolean {
    return id in MODEL_REGISTRY;
}
