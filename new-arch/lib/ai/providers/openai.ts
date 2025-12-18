"use server";

/**
 * OpenAI Provider Adapter
 * @module new-arch/lib/ai/providers/openai
 *
 * Lazy-initialized OpenAI provider using Vercel AI SDK.
 * No import side effects - provider created only when accessed.
 */

import type { ProviderV2 } from "@ai-sdk/provider";
import type { AIProviderId } from "../types";

// ============================================================================
// Types
// ============================================================================

export type OpenAIProviderOptions = {
    readonly apiKey?: string;
    readonly baseURL?: string;
    readonly organization?: string;
};

// ============================================================================
// Lazy Provider Instance
// ============================================================================

let cachedProvider: ProviderV2 | null = null;
let cachedApiKey: string | null = null;

/**
 * Gets or creates the OpenAI provider instance.
 * Uses lazy initialization to avoid import side effects.
 *
 * @param options - Optional configuration overrides
 * @returns OpenAI provider instance or null if not configured
 */
export function getOpenAIProvider(
    options?: OpenAIProviderOptions
): ProviderV2 | null {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return null;
    }

    // Return cached instance if API key matches
    if (cachedProvider && cachedApiKey === apiKey) {
        return cachedProvider;
    }

    // Lazy import to avoid side effects at module load
    const { createOpenAI } =
        require("@ai-sdk/openai") as typeof import("@ai-sdk/openai");

    cachedProvider = createOpenAI({
        apiKey,
        ...(options?.baseURL && { baseURL: options.baseURL }),
        ...(options?.organization && { organization: options.organization }),
    }) as unknown as ProviderV2;

    cachedApiKey = apiKey;

    return cachedProvider;
}

/**
 * Checks if OpenAI provider is available (has required env vars).
 */
export function isOpenAIAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Provider metadata for registry.
 */
export const OPENAI_PROVIDER_META = {
    id: "openai" as AIProviderId,
    displayName: "OpenAI",
    envVars: ["OPENAI_API_KEY"] as const,
    getProvider: getOpenAIProvider,
    isAvailable: isOpenAIAvailable,
} as const;

/**
 * Clears the cached provider instance.
 * Useful for testing or when API key changes.
 */
export function clearOpenAICache(): void {
    cachedProvider = null;
    cachedApiKey = null;
}
