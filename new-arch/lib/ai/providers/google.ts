"use server";

/**
 * Google AI Provider Adapter
 * @module new-arch/lib/ai/providers/google
 *
 * Lazy-initialized Google Generative AI provider using Vercel AI SDK.
 * No import side effects - provider created only when accessed.
 */

import type { ProviderV2 } from "@ai-sdk/provider";
import type { AIProviderId } from "../types";

// ============================================================================
// Types
// ============================================================================

export type GoogleProviderOptions = {
    readonly apiKey?: string;
    readonly baseURL?: string;
};

// ============================================================================
// Lazy Provider Instance
// ============================================================================

let cachedProvider: ProviderV2 | null = null;
let cachedApiKey: string | null = null;

/**
 * Gets the Google AI API key from environment variables.
 * Supports both GOOGLE_GENERATIVE_AI_API_KEY and GEMINI_API_KEY.
 */
function getGoogleApiKey(): string | undefined {
    return (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
    );
}

/**
 * Gets or creates the Google AI provider instance.
 * Uses lazy initialization to avoid import side effects.
 *
 * @param options - Optional configuration overrides
 * @returns Google AI provider instance or null if not configured
 */
export function getGoogleProvider(
    options?: GoogleProviderOptions
): ProviderV2 | null {
    const apiKey = options?.apiKey ?? getGoogleApiKey();

    if (!apiKey) {
        return null;
    }

    // Return cached instance if API key matches
    if (cachedProvider && cachedApiKey === apiKey) {
        return cachedProvider;
    }

    // Lazy import to avoid side effects at module load
    const { createGoogleGenerativeAI } =
        require("@ai-sdk/google") as typeof import("@ai-sdk/google");

    cachedProvider = createGoogleGenerativeAI({
        apiKey,
        ...(options?.baseURL && { baseURL: options.baseURL }),
    }) as unknown as ProviderV2;

    cachedApiKey = apiKey;

    return cachedProvider;
}

/**
 * Checks if Google AI provider is available (has required env vars).
 */
export function isGoogleAvailable(): boolean {
    return Boolean(getGoogleApiKey());
}

/**
 * Provider metadata for registry.
 */
export const GOOGLE_PROVIDER_META = {
    id: "google" as AIProviderId,
    displayName: "Google Gemini",
    envVars: ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"] as const,
    getProvider: getGoogleProvider,
    isAvailable: isGoogleAvailable,
} as const;

/**
 * Clears the cached provider instance.
 * Useful for testing or when API key changes.
 */
export function clearGoogleCache(): void {
    cachedProvider = null;
    cachedApiKey = null;
}
