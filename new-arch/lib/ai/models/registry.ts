"use server";

/**
 * Model Registry
 * @module new-arch/lib/ai/models/registry
 *
 * Central registry for AI models with capability-based lookup,
 * provider filtering, and lazy initialization.
 */

import type {
    AIProviderId,
    ModelConfig,
    ModelSource,
    ReasoningType,
} from "../types";

// ============================================================================
// Registry Types
// ============================================================================

/** Model registry entry with additional metadata */
export type ModelRegistryEntry = ModelConfig & {
    /** Whether model is currently available */
    readonly isAvailable: boolean;
    /** Last availability check timestamp */
    readonly lastChecked?: Date;
};

/** Registry configuration */
export type ModelRegistryConfig = {
    /** Enable automatic provider discovery */
    readonly enableDiscovery: boolean;
    /** Cache TTL in milliseconds */
    readonly cacheTtlMs: number;
    /** Preferred providers in priority order */
    readonly preferredProviders: readonly AIProviderId[];
};

/** Registry state */
type RegistryState = {
    models: Map<string, ModelRegistryEntry>;
    lastRefresh: Date | null;
    isInitialized: boolean;
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REGISTRY_CONFIG: ModelRegistryConfig = {
    enableDiscovery: true,
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes
    preferredProviders: ["openai", "anthropic", "google"],
};

// ============================================================================
// Registry Implementation
// ============================================================================

/** Internal registry state */
const state: RegistryState = {
    models: new Map(),
    lastRefresh: null,
    isInitialized: false,
};

/** Current configuration */
let config: ModelRegistryConfig = { ...DEFAULT_REGISTRY_CONFIG };

/**
 * Configure the model registry
 */
export function configureRegistry(
    newConfig: Partial<ModelRegistryConfig>
): void {
    config = { ...config, ...newConfig };
}

/**
 * Register a model in the registry
 */
export function registerModel(model: ModelConfig): void {
    const entry: ModelRegistryEntry = {
        ...model,
        isAvailable: true,
        lastChecked: new Date(),
    };
    state.models.set(model.id, entry);
}

/**
 * Register multiple models at once
 */
export function registerModels(models: readonly ModelConfig[]): void {
    for (const model of models) {
        registerModel(model);
    }
}

/**
 * Unregister a model from the registry
 */
export function unregisterModel(modelId: string): boolean {
    return state.models.delete(modelId);
}

/**
 * Get a model by ID
 */
export function getModel(modelId: string): ModelRegistryEntry | undefined {
    return state.models.get(modelId);
}

/**
 * Get all registered models
 */
export function getAllModels(): readonly ModelRegistryEntry[] {
    return Array.from(state.models.values());
}

/**
 * Get models by provider
 */
export function getModelsByProvider(
    providerId: AIProviderId
): readonly ModelRegistryEntry[] {
    return Array.from(state.models.values()).filter(
        (model) => model.providerId === providerId
    );
}

/**
 * Get available models only
 */
export function getAvailableModels(): readonly ModelRegistryEntry[] {
    return Array.from(state.models.values()).filter(
        (model) => model.isAvailable
    );
}

/**
 * Get models by source type
 */
export function getModelsBySource(
    source: ModelSource
): readonly ModelRegistryEntry[] {
    return Array.from(state.models.values()).filter(
        (model) => model.source === source
    );
}

/**
 * Get models by reasoning type
 */
export function getModelsByReasoningType(
    reasoningType: ReasoningType
): readonly ModelRegistryEntry[] {
    return Array.from(state.models.values()).filter(
        (model) => model.reasoningType === reasoningType
    );
}

/**
 * Check if a model exists in the registry
 */
export function hasModel(modelId: string): boolean {
    return state.models.has(modelId);
}

/**
 * Update model availability status
 */
export function updateModelAvailability(
    modelId: string,
    isAvailable: boolean
): void {
    const model = state.models.get(modelId);
    if (model) {
        state.models.set(modelId, {
            ...model,
            isAvailable,
            lastChecked: new Date(),
        });
    }
}

/**
 * Get registry statistics
 */
export function getRegistryStats(): {
    totalModels: number;
    availableModels: number;
    byProvider: Record<string, number>;
    byCapability: Record<string, number>;
} {
    const models = Array.from(state.models.values());
    const byProvider: Record<string, number> = {};
    const byCapability: Record<string, number> = {};

    for (const model of models) {
        byProvider[model.providerId] = (byProvider[model.providerId] || 0) + 1;
        for (const cap of model.capabilities) {
            byCapability[cap] = (byCapability[cap] || 0) + 1;
        }
    }

    return {
        totalModels: models.length,
        availableModels: models.filter((m) => m.isAvailable).length,
        byProvider,
        byCapability,
    };
}

/**
 * Clear all models from the registry
 */
export function clearRegistry(): void {
    state.models.clear();
    state.lastRefresh = null;
    state.isInitialized = false;
}

/**
 * Check if registry needs refresh based on TTL
 */
export function needsRefresh(): boolean {
    if (!state.lastRefresh) {
        return true;
    }
    const elapsed = Date.now() - state.lastRefresh.getTime();
    return elapsed > config.cacheTtlMs;
}

/**
 * Mark registry as refreshed
 */
export function markRefreshed(): void {
    state.lastRefresh = new Date();
    state.isInitialized = true;
}

/**
 * Check if registry is initialized
 */
export function isInitialized(): boolean {
    return state.isInitialized;
}

/**
 * Get current registry configuration
 */
export function getRegistryConfig(): Readonly<ModelRegistryConfig> {
    return { ...config };
}
