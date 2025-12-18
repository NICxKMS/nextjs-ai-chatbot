"use server";

/**
 * Provider Registry
 * @module new-arch/lib/ai/providers/registry
 *
 * Central registry for AI providers with lazy initialization.
 * Providers are only instantiated when first accessed.
 */

import type { ProviderV2 } from "@ai-sdk/provider";
import type { AIProviderId } from "../types";
import { ANTHROPIC_PROVIDER_META, clearAnthropicCache } from "./anthropic";
import { clearGoogleCache, GOOGLE_PROVIDER_META } from "./google";
import { clearOpenAICache, OPENAI_PROVIDER_META } from "./openai";

// ============================================================================
// Types
// ============================================================================

export type ProviderMeta = {
    readonly id: AIProviderId;
    readonly displayName: string;
    readonly envVars: readonly string[];
    readonly getProvider: () => ProviderV2 | null;
    readonly isAvailable: () => boolean;
};

export type ProviderRegistryEntry = {
    readonly meta: ProviderMeta;
    instance: ProviderV2 | null;
    initialized: boolean;
};

// ============================================================================
// Registry State
// ============================================================================

const providerMetaMap = new Map<AIProviderId, ProviderMeta>();
providerMetaMap.set("openai", OPENAI_PROVIDER_META);
providerMetaMap.set(
    "anthropic",
    ANTHROPIC_PROVIDER_META as unknown as ProviderMeta
);
providerMetaMap.set("google", GOOGLE_PROVIDER_META);

/** Cached provider instances keyed by provider ID */
const providerCache = new Map<AIProviderId, ProviderV2>();

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Gets a provider by ID with lazy initialization.
 * Returns null if provider is not available (missing env vars).
 *
 * @param providerId - The provider identifier
 * @returns Provider instance or null if not available
 */
export function getProvider(providerId: AIProviderId): ProviderV2 | null {
    // Check cache first
    const cached = providerCache.get(providerId);
    if (cached) {
        return cached;
    }

    // Get provider meta
    const meta = providerMetaMap.get(providerId);
    if (!meta) {
        return null;
    }

    // Lazy initialize
    const provider = meta.getProvider();
    if (provider) {
        providerCache.set(providerId, provider);
    }

    return provider;
}

/**
 * Gets a provider by ID, throwing if not available.
 *
 * @param providerId - The provider identifier
 * @throws Error if provider is not available
 * @returns Provider instance
 */
export function getProviderOrThrow(providerId: AIProviderId): ProviderV2 {
    const provider = getProvider(providerId);
    if (!provider) {
        const meta = providerMetaMap.get(providerId);
        const envVars =
            meta?.envVars.join(" or ") ?? "required environment variables";
        throw new Error(
            `Provider '${providerId}' is not available. Please set ${envVars}.`
        );
    }
    return provider;
}

/**
 * Checks if a provider is available (has required configuration).
 *
 * @param providerId - The provider identifier
 * @returns true if provider can be initialized
 */
export function isProviderAvailable(providerId: AIProviderId): boolean {
    const meta = providerMetaMap.get(providerId);
    return meta?.isAvailable() ?? false;
}

/**
 * Gets all available provider IDs.
 *
 * @returns Array of provider IDs that are currently available
 */
export function getAvailableProviderIds(): AIProviderId[] {
    const available: AIProviderId[] = [];
    for (const [id, meta] of providerMetaMap) {
        if (meta.isAvailable()) {
            available.push(id);
        }
    }
    return available;
}

/**
 * Gets all registered provider metadata.
 *
 * @returns Array of all provider metadata
 */
export function getAllProviderMeta(): ProviderMeta[] {
    return Array.from(providerMetaMap.values());
}

/**
 * Gets provider metadata by ID.
 *
 * @param providerId - The provider identifier
 * @returns Provider metadata or undefined
 */
export function getProviderMeta(
    providerId: AIProviderId
): ProviderMeta | undefined {
    return providerMetaMap.get(providerId);
}

/**
 * Registers a custom provider.
 * Used for extending the registry with additional providers.
 *
 * @param meta - Provider metadata with factory function
 */
export function registerProvider(meta: ProviderMeta): void {
    (providerMetaMap as Map<AIProviderId, ProviderMeta>).set(meta.id, meta);
}

/**
 * Clears all cached provider instances.
 * Useful for testing or when configuration changes.
 */
export function clearProviderCache(): void {
    providerCache.clear();
    clearOpenAICache();
    clearAnthropicCache();
    clearGoogleCache();
}

/**
 * Gets a map of all available providers (lazy-initialized).
 * Only initializes providers that are available.
 *
 * @returns Map of provider ID to provider instance
 */
export function getAvailableProviders(): Map<AIProviderId, ProviderV2> {
    const providers = new Map<AIProviderId, ProviderV2>();

    for (const id of getAvailableProviderIds()) {
        const provider = getProvider(id);
        if (provider) {
            providers.set(id, provider);
        }
    }

    return providers;
}
