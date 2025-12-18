"use server";

/**
 * Anthropic Provider Adapter
 * @module new-arch/lib/ai/providers/anthropic
 *
 * Lazy-initialized Anthropic provider using Vercel AI SDK.
 * No import side effects - provider created only when accessed.
 */

import type { ProviderV2 } from "@ai-sdk/provider";
import type { AIProviderId } from "../types";

// ============================================================================
// Types
// ============================================================================

export type AnthropicProviderOptions = {
    readonly apiKey?: string;
    readonly baseURL?: string;
};

// ============================================================================
// Lazy Provider Instance
// ============================================================================

let cachedProvider: ProviderV2 | null = null;
let cachedApiKey: string | null = null;

/**
 * Gets or creates the Anthropic provider instance.
 * Uses lazy initialization to avoid import side effects.
 *
 * @param options - Optional configuration overrides
 * @returns Anthropic provider instance or null if not configured
 */
export function getAnthropicProvider(
    options?: AnthropicProviderOptions
): ProviderV2 | null {
    const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return null;
    }

    // Return cached instance if API key matches
    if (cachedProvider && cachedApiKey === apiKey) {
        return cachedProvider;
    }

    // Lazy import to avoid side effects at module load
    const { createAnthropic } =
        require("@ai-sdk/anthropic") as typeof import("@ai-sdk/anthropic");

    cachedProvider = createAnthropic({
        apiKey,
        ...(options?.baseURL && { baseURL: options.baseURL }),
    }) as unknown as ProviderV2;

    cachedApiKey = apiKey;

    return cachedProvider;
}

/**
 * Checks if Anthropic provider is available (has required env vars).
 */
export function isAnthropicAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Provider metadata for registry.
 */
export const ANTHROPIC_PROVIDER_META = {
    id: "anthropic" as AIProviderId,
    displayName: "Anthropic",
    envVars: ["ANTHROPIC_API_KEY"] as const,
    getProvider: getAnthropicProvider,
    isAvailable: isAnthropicAvailable,
} as const;

/**
 * Clears the cached provider instance.
 * Useful for testing or when API key changes.
 */
export function clearAnthropicCache(): void {
    cachedProvider = null;
    cachedApiKey = null;
}
