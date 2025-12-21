/**
 * AI Provider Configuration
 * Ref: 05-ai-integration-optimal-design.md §2
 *
 * Lazy initialization pattern to avoid errors when env vars not set.
 * Providers are only instantiated when actually used.
 *
 * Supports: OpenAI, Anthropic, Google, OpenRouter, Cloudflare (Workers + AI Gateway)
 *
 * @module lib/ai/providers
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Get OpenAI provider instance
 * @throws Error if OPENAI_API_KEY is not configured
 */
export function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
    }
    return createOpenAI({ apiKey });
}

/**
 * Get Anthropic provider instance
 * @throws Error if ANTHROPIC_API_KEY is not configured
 */
export function getAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY not configured");
    }
    return createAnthropic({ apiKey });
}

/**
 * Get Google Generative AI provider instance
 * @throws Error if GOOGLE_GENERATIVE_AI_API_KEY is not configured
 */
export function getGoogle() {
    const apiKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    }
    return createGoogleGenerativeAI({ apiKey });
}

/**
 * Get OpenRouter provider instance
 * Provides access to Claude, DeepSeek, Qwen, and other models via OpenRouter
 * @throws Error if OPENROUTER_API_KEY is not configured
 */
export function getOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not configured");
    }
    return createOpenRouter({ apiKey });
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
