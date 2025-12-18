/**
 * Model Catalog Types
 * @module new-arch/lib/ai/model-catalog-types
 *
 * Client-safe type definitions for model metadata and provider catalogs.
 * These types are used in UI components for model selection.
 */

import type {
    AIProviderId,
    ModelCapability,
    ModelModality,
    ReasoningType,
} from "./types";

/**
 * Provider ID type alias for external compatibility
 */
export type ProviderId = AIProviderId;

/**
 * Model metadata for UI display
 */
export type ModelMetadata = {
    id: string;
    providerId: ProviderId;
    providerName: string;
    modelId: string;
    name: string;
    description: string;
    release?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    modalities: ModelModality[];
    capabilities: ModelCapability[];
    tags: string[];
    price?: string;
    source: "curated" | "discovered";
    isCurated: boolean;
    reasoningType?: ReasoningType;
    thinkingBudget?: number;
};

/**
 * Provider catalog containing models
 */
export type ProviderCatalog = {
    providerId: ProviderId;
    displayName: string;
    models: ModelMetadata[];
    fetchedAt: string;
};

/**
 * Complete model catalog response
 */
export type ModelCatalogResponse = {
    providers: ProviderCatalog[];
    fallback: ModelMetadata[];
    fetchedAt: string;
};
