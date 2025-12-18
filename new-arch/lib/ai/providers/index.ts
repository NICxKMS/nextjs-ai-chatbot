"use server";

/**
 * AI Providers Module
 * @module new-arch/lib/ai/providers
 *
 * Barrel exports for AI provider adapters with lazy initialization.
 * All providers use the Vercel AI SDK patterns.
 */

export {
    ANTHROPIC_PROVIDER_META,
    type AnthropicProviderOptions,
    clearAnthropicCache,
    getAnthropicProvider,
    isAnthropicAvailable,
} from "./anthropic";
export {
    clearGoogleCache,
    GOOGLE_PROVIDER_META,
    type GoogleProviderOptions,
    getGoogleProvider,
    isGoogleAvailable,
} from "./google";
// Individual provider adapters
export {
    clearOpenAICache,
    getOpenAIProvider,
    isOpenAIAvailable,
    OPENAI_PROVIDER_META,
    type OpenAIProviderOptions,
} from "./openai";
// Registry (primary API)
export {
    clearProviderCache,
    getAllProviderMeta,
    getAvailableProviderIds,
    getAvailableProviders,
    getProvider,
    getProviderMeta,
    getProviderOrThrow,
    isProviderAvailable,
    type ProviderMeta,
    type ProviderRegistryEntry,
    registerProvider,
} from "./registry";
