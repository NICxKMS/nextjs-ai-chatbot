/**
 * Model Service Facade
 *
 * Consolidates AI model-related dependencies into a single interface.
 * Reduces coupling by providing a unified access point for model configuration.
 *
 * @module features/chat/services/model-service
 */

import { DEFAULT_MODEL_ID } from "@/lib/ai/config";
import { getAvailableModels } from "@/lib/ai/models";
import type { ModelMetadata } from "@/lib/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Model service interface for dependency injection.
 * Allows for easy mocking in tests.
 */
export interface IModelService {
    /** Get the default model ID */
    getDefaultModelId: () => string;
    /** Get all available models */
    getAvailableModels: () => ModelMetadata[];
}

/**
 * Persistence interface for model selection.
 * Abstracts localStorage/settings persistence.
 */
export interface IModelPersistence {
    /** Persist the selected model ID */
    persistModelId: (modelId: string) => void;
}

// =============================================================================
// DEFAULT IMPLEMENTATION
// =============================================================================

/**
 * Default model service implementation.
 * Uses the actual AI config and model registry.
 */
export const defaultModelService: IModelService = {
    getDefaultModelId: () => DEFAULT_MODEL_ID,
    getAvailableModels: () => getAvailableModels(),
};

/**
 * Create a model service with custom implementation.
 * Useful for testing or alternative configurations.
 *
 * @param overrides - Partial overrides for the service
 * @returns Model service instance
 *
 * @example
 * ```tsx
 * // For testing
 * const mockService = createModelService({
 *   getAvailableModels: () => [mockModel],
 * });
 * ```
 */
export function createModelService(
    overrides: Partial<IModelService> = {}
): IModelService {
    return {
        ...defaultModelService,
        ...overrides,
    };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get the default model ID.
 * Convenience function that uses the default service.
 */
export function getDefaultModelId(): string {
    return defaultModelService.getDefaultModelId();
}

/**
 * Get available models list.
 * Convenience function that uses the default service.
 */
export function getModels(): ModelMetadata[] {
    return defaultModelService.getAvailableModels();
}
