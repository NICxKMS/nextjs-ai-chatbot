"use server";

/**
 * Model Registry
 * @module new-arch/lib/ai/model-registry
 *
 * Model catalog management with refresh functionality.
 * This module provides a client-callable interface for model catalog operations.
 */

import type { ModelMetadata, ProviderCatalog } from "./model-catalog-types";

// ============================================================================
// Internal State
// ============================================================================

const modelCatalog: ModelMetadata[] = [];
const providerCatalogs: ProviderCatalog[] = [];
const discoveryErrors: Record<string, Error> = {};
let lastRefreshAt: string | null = null;

// ============================================================================
// Public API
// ============================================================================

/**
 * Force refresh the model catalog from all providers
 * @returns Promise resolving to refresh result
 */
export async function forceRefreshModelCatalog(): Promise<{
    models: ModelMetadata[];
    catalogs: ProviderCatalog[];
    errors: Record<string, Error>;
}> {
    // In a real implementation, this would call provider discovery APIs
    // For now, return the current catalog state
    lastRefreshAt = new Date().toISOString();

    // Add await to satisfy TypeScript async requirement
    await Promise.resolve();

    return {
        models: modelCatalog,
        catalogs: providerCatalogs,
        errors: discoveryErrors,
    };
}

/**
 * Refresh the model catalog with optional force flag
 * @param options - Refresh options
 * @returns Promise resolving to refresh result
 */
export async function refreshModelCatalog(options?: {
    force?: boolean;
}): Promise<{
    models: ModelMetadata[];
    catalogs: ProviderCatalog[];
    errors: Record<string, Error>;
}> {
    if (options?.force) {
        return forceRefreshModelCatalog();
    }

    // Add await to satisfy TypeScript async requirement
    await Promise.resolve();

    // Return cached catalog if available
    return {
        models: modelCatalog,
        catalogs: providerCatalogs,
        errors: discoveryErrors,
    };
}

/**
 * Get the current model catalog
 * @returns Array of model metadata
 */
export function getModelCatalog(): ModelMetadata[] {
    return modelCatalog;
}

/**
 * List all provider catalogs
 * @returns Array of provider catalogs
 */
export function listProviderCatalogs(): ProviderCatalog[] {
    return providerCatalogs;
}

/**
 * Get a model by ID
 * @param id - Model ID
 * @returns Model metadata or undefined
 */
export function getModelById(id: string): ModelMetadata | undefined {
    return modelCatalog.find((model) => model.id === id);
}

/**
 * List all chat-capable models
 * @returns Array of chat models
 */
export function listChatModels(): ModelMetadata[] {
    return modelCatalog.filter((model) => model.capabilities.includes("chat"));
}

/**
 * Check if a model ID is valid
 * @param id - Model ID to validate
 * @returns true if valid
 */
export function isValidModelId(id: string): boolean {
    return modelCatalog.some((model) => model.id === id);
}

/**
 * Get last refresh timestamp
 * @returns ISO timestamp or null
 */
export function getLastRefreshAt(): string | null {
    return lastRefreshAt;
}
