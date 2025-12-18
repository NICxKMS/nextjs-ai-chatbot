"use server";

/**
 * Models Module
 * @module new-arch/lib/ai/models
 *
 * Model registry and selection utilities for AI provider integration.
 *
 * @example
 * ```ts
 * import {
 *   registerModel,
 *   selectModel,
 *   getModelsByCapability
 * } from '@/lib/ai/models';
 *
 * // Register a model
 * registerModel({
 *   id: 'openai:gpt-4o',
 *   providerId: 'openai',
 *   // ... other config
 * });
 *
 * // Select best model for task
 * const result = selectModel({
 *   requiredCapabilities: ['vision', 'tooling'],
 *   preferredProviders: ['openai', 'anthropic'],
 * });
 * ```
 */

// ============================================================================
// Registry Exports
// ============================================================================

export {
    clearRegistry,
    // Configuration
    configureRegistry,
    getAllModels,
    getAvailableModels,
    // Retrieval
    getModel,
    getModelsByProvider,
    getModelsByReasoningType,
    getModelsBySource,
    getRegistryConfig,
    getRegistryStats,
    // Utilities
    hasModel,
    isInitialized,
    type ModelRegistryConfig,
    // Types
    type ModelRegistryEntry,
    markRefreshed,
    needsRefresh,
    // Registration
    registerModel,
    registerModels,
    unregisterModel,
    updateModelAvailability,
} from "./registry";

// ============================================================================
// Selection Exports
// ============================================================================

export {
    findSimilarModels,
    getModelsByCapability,
    getModelsWithAllCapabilities,
    getRecommendedModel,
    // Types
    type ModelSelectionResult,
    // Selection functions
    selectModel,
    selectModelById,
} from "./selection";
