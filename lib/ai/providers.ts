/**
 * AI Provider Configuration
 * Ref: 05-ai-integration-optimal-design.md §2
 *
 * Lazy initialization pattern to avoid errors when env vars not set.
 * Providers are only instantiated when actually used.
 *
 * @module lib/ai/providers
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

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
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    }
    return createGoogleGenerativeAI({ apiKey });
}
