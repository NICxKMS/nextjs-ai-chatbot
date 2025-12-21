/**
 * AI Provider Configuration
 * Ref: 05-ai-integration-optimal-design.md §2
 *
 * Uses createProviderRegistry pattern from OldApp for unified model resolution.
 * Providers are conditionally registered based on env var availability.
 *
 * Supports: OpenAI, Anthropic, Google, OpenRouter, Cloudflare (Workers + AI Gateway)
 *
 * @module lib/ai/providers
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderV2 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
    experimental_createProviderRegistry as createProviderRegistry,
    type LanguageModel,
} from "ai";
import { MODEL_REGISTRY } from "./models";
import { getReasoningType, wrapWithReasoningMiddleware } from "./reasoning";

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_GENERATIVE_AI_API_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================================================================
// PROVIDER REGISTRY (OldApp Pattern)
// =============================================================================

const baseProviders: Record<string, ProviderV2> = {};

/**
 * Register a provider if it's available (has API key configured)
 */
const registerProvider = (id: string, provider: ProviderV2 | undefined) => {
    if (provider) {
        baseProviders[id] = provider;
    }
};

// Conditionally register providers based on available API keys
if (OPENAI_API_KEY) {
    registerProvider(
        "openai",
        createOpenAI({ apiKey: OPENAI_API_KEY }) as unknown as ProviderV2
    );
}

if (ANTHROPIC_API_KEY) {
    registerProvider(
        "anthropic",
        createAnthropic({ apiKey: ANTHROPIC_API_KEY }) as unknown as ProviderV2
    );
}

if (GOOGLE_GENERATIVE_AI_API_KEY) {
    registerProvider(
        "google",
        createGoogleGenerativeAI({
            apiKey: GOOGLE_GENERATIVE_AI_API_KEY,
        }) as unknown as ProviderV2
    );
}

if (OPENROUTER_API_KEY) {
    registerProvider(
        "openrouter",
        createOpenRouter({
            apiKey: OPENROUTER_API_KEY,
        }) as unknown as ProviderV2
    );
}

// Create the unified provider registry
const providerRegistry = createProviderRegistry(baseProviders);

// =============================================================================
// UNIFIED MODEL RESOLUTION (OldApp Pattern)
// =============================================================================

/**
 * Get a language model from the unified registry
 * Automatically wraps reasoning models with chain-of-thought middleware
 *
 * @param id - Model ID in format "provider:modelId" or just "modelId" (will lookup provider)
 * @returns LanguageModel instance, wrapped with reasoning middleware if applicable
 */
export function getLanguageModel(id: string): LanguageModel {
    // Get metadata for model wrapping
    const metadata = MODEL_REGISTRY[id];

    // Resolve the actual provider:modelId format
    let resolvedId: string;
    if (id.includes(":")) {
        // Already in provider:model format
        // Extract actual model name (remove provider prefix for providers that expect just the model name)
        const [provider, ...modelParts] = id.split(":");
        const modelName = modelParts.join(":");
        resolvedId = `${provider}:${modelName}`;
    } else if (metadata) {
        // Use metadata to determine provider
        resolvedId = `${metadata.provider}:${id}`;
    } else {
        // Fallback: assume it's the full ID
        resolvedId = id;
    }

    const model = providerRegistry.languageModel(
        resolvedId as `${string}:${string}`
    );

    // Wrap with reasoning middleware if this is a reasoning model
    const reasoningType = getReasoningType(id);
    if (reasoningType !== "none") {
        return wrapWithReasoningMiddleware(model, id);
    }

    return model;
}

/**
 * myProvider wrapper (OldApp Pattern)
 * Provides a simple interface for getting language models with automatic
 * reasoning middleware wrapping.
 *
 * Usage: myProvider.languageModel("openai:gpt-4o")
 */
export const myProvider = {
    languageModel(id: string): LanguageModel {
        return getLanguageModel(id);
    },
};

// =============================================================================
// LEGACY GETTER FUNCTIONS (Backward Compatibility)
// =============================================================================

/**
 * Get OpenAI provider instance
 * @throws Error if OPENAI_API_KEY is not configured
 */
export function getOpenAI() {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured");
    }
    return createOpenAI({ apiKey: OPENAI_API_KEY });
}

/**
 * Get Anthropic provider instance
 * @throws Error if ANTHROPIC_API_KEY is not configured
 */
export function getAnthropic() {
    if (!ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not configured");
    }
    return createAnthropic({ apiKey: ANTHROPIC_API_KEY });
}

/**
 * Get Google Generative AI provider instance
 * @throws Error if GOOGLE_GENERATIVE_AI_API_KEY is not configured
 */
export function getGoogle() {
    if (!GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    }
    return createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY });
}

/**
 * Get OpenRouter provider instance
 * Provides access to Claude, DeepSeek, Qwen, and other models via OpenRouter
 * @throws Error if OPENROUTER_API_KEY is not configured
 */
export function getOpenRouter() {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not configured");
    }
    return createOpenRouter({ apiKey: OPENROUTER_API_KEY });
}

/**
 * Check if OpenRouter is available (API key configured)
 */
export function isOpenRouterAvailable(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Check if Cloudflare Workers AI is available
 * Requires either binding (in Workers environment) or accountId + apiKey
 */
export function isCloudflareWorkersAvailable(): boolean {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    // Both accountId and apiKey required for REST API usage
    return Boolean(accountId && apiKey);
}

/**
 * Check if Cloudflare AI Gateway is available
 */
export function isCloudflareAIGatewayAvailable(): boolean {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const gatewayName = process.env.CLOUDFLARE_AI_GATEWAY_NAME;
    const gatewayApiKey =
        process.env.CLOUDFLARE_AI_GATEWAY_API_KEY ??
        process.env.CLOUDFLARE_AI_GATEWAY_TOKEN ??
        process.env.CLOUDFLARE_API_KEY;
    return Boolean(accountId && gatewayName && gatewayApiKey);
}

/**
 * Get Cloudflare Workers AI provider instance
 * @throws Error if Cloudflare credentials are not configured
 */
export async function getCloudflareWorkers() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;

    if (!accountId || !apiKey) {
        throw new Error(
            "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY not configured"
        );
    }

    // Dynamic import to avoid bundling issues if not used
    const { createWorkersAI } = await import("workers-ai-provider");

    // WorkersAI requires both accountId and apiKey for REST API usage
    return createWorkersAI({ accountId, apiKey });
}

/**
 * Get Cloudflare AI Gateway provider instance
 * Wraps Google provider with Cloudflare AI Gateway for fallback support
 * @throws Error if Cloudflare AI Gateway is not configured
 */
export async function getCloudflareAIGateway() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const gatewayName = process.env.CLOUDFLARE_AI_GATEWAY_NAME;
    const gatewayApiKey =
        process.env.CLOUDFLARE_AI_GATEWAY_API_KEY ??
        process.env.CLOUDFLARE_AI_GATEWAY_TOKEN ??
        process.env.CLOUDFLARE_API_KEY;

    if (!accountId || !gatewayName || !gatewayApiKey) {
        throw new Error("Cloudflare AI Gateway not properly configured");
    }

    const googleApiKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

    if (!googleApiKey) {
        throw new Error(
            "GOOGLE_GENERATIVE_AI_API_KEY required for Cloudflare AI Gateway"
        );
    }

    // Dynamic import to avoid bundling issues if not used
    const { createAiGateway } = await import("ai-gateway-provider");

    const googleProvider = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const aiGateway = createAiGateway({
        accountId,
        gateway: gatewayName,
        apiKey: gatewayApiKey,
    });

    // Supported Gemini models via Cloudflare AI Gateway
    const supportedModels = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
    ];

    return {
        languageModel(modelId: string) {
            if (!supportedModels.includes(modelId)) {
                throw new Error(
                    `Model "${modelId}" not supported via Cloudflare AI Gateway. Supported: ${supportedModels.join(", ")}`
                );
            }

            const primaryModel = googleProvider(modelId);

            // Use flash-lite as fallback for all models except itself
            if (modelId === "gemini-2.5-flash-lite") {
                return aiGateway([primaryModel]);
            }

            const fallbackModel = googleProvider("gemini-2.5-flash-lite");
            return aiGateway([primaryModel, fallbackModel]);
        },
    };
}

/**
 * Provider availability map for runtime checking
 */
export function getAvailableProviders(): string[] {
    const providers: string[] = [];

    if (process.env.OPENAI_API_KEY) {
        providers.push("openai");
    }
    if (process.env.ANTHROPIC_API_KEY) {
        providers.push("anthropic");
    }
    if (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY
    ) {
        providers.push("google");
    }
    if (process.env.OPENROUTER_API_KEY) {
        providers.push("openrouter");
    }
    if (isCloudflareWorkersAvailable()) {
        providers.push("cloudflare-workers");
    }
    if (isCloudflareAIGatewayAvailable()) {
        providers.push("cloudflare-ai-gateway");
    }

    return providers;
}
