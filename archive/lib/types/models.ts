/**
 * Model Type Definitions
 *
 * Shared types for AI models used across lib/ and features/ layers.
 * Placed in lib/types/ to prevent circular dependencies.
 *
 * @module lib/types/models
 */

/**
 * Model capability flags.
 */
export type ModelCapabilities = {
    /** Whether the model can process image inputs */
    supportsImages: boolean;
    /** Whether the model supports tool/function calling */
    supportsTools: boolean;
    /** Whether the model supports reasoning/thinking mode */
    supportsReasoning: boolean;
    /** Maximum output token limit */
    maxTokens?: number;
};

/**
 * Metadata for an AI model.
 */
export type ModelMetadata = {
    /** Unique identifier for the model */
    id: string;
    /** Human-readable display name */
    name: string;
    /** Provider name (e.g., 'openai', 'anthropic') */
    provider: string;
    /** Optional description of the model */
    description?: string;
    /** Optional capability flags */
    capabilities?: ModelCapabilities;
};
