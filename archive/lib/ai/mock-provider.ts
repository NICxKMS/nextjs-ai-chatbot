/**
 * Mock AI Provider for Testing
 *
 * Provides a mock language model that returns predefined responses.
 * Use in E2E tests to avoid real API calls.
 *
 * Enable by setting USE_MOCK_AI=true in environment.
 *
 * Custom implementation that doesn't require 'ai/test' or 'msw',
 * making it safe to import in production builds.
 *
 * @module lib/ai/mock-provider
 */

import type {
    LanguageModelV2,
    LanguageModelV2CallOptions,
    LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";

/**
 * Configuration for the mock provider.
 */
export type MockProviderConfig = {
    /** Default response text for non-configured prompts */
    defaultResponse?: string;
    /** Map of prompt patterns to responses */
    responseMap?: Map<RegExp, string>;
    /** Simulated delay in milliseconds */
    delay?: number;
    /** Whether to simulate streaming */
    simulateStreaming?: boolean;
};

/**
 * Default configuration for the mock provider.
 */
const DEFAULT_CONFIG: Required<MockProviderConfig> = {
    defaultResponse: "This is a mock AI response for testing purposes.",
    responseMap: new Map(),
    delay: 100,
    simulateStreaming: true,
};

/**
 * Global mock provider configuration.
 * Set this before tests to customize behavior.
 */
let globalConfig: Required<MockProviderConfig> = { ...DEFAULT_CONFIG };

/**
 * Configure the mock provider globally.
 *
 * @param config - Configuration options
 *
 * @example
 * ```ts
 * configureMockProvider({
 *   defaultResponse: 'Hello from mock!',
 *   delay: 50,
 * });
 * ```
 */
export function configureMockProvider(config: MockProviderConfig): void {
    globalConfig = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Reset mock provider to default configuration.
 */
export function resetMockProvider(): void {
    globalConfig = { ...DEFAULT_CONFIG };
}

/**
 * Add a response mapping for specific prompt patterns.
 *
 * @param pattern - RegExp to match against prompt
 * @param response - Response text to return
 *
 * @example
 * ```ts
 * addMockResponse(/hello/i, 'Hello! How can I help you?');
 * ```
 */
export function addMockResponse(pattern: RegExp, response: string): void {
    globalConfig.responseMap.set(pattern, response);
}

/**
 * Clear all response mappings.
 */
export function clearMockResponses(): void {
    globalConfig.responseMap.clear();
}

/**
 * Get response text for a given prompt.
 */
function getResponseForPrompt(prompt: string): string {
    for (const [pattern, response] of globalConfig.responseMap) {
        if (pattern.test(prompt)) {
            return response;
        }
    }
    return globalConfig.defaultResponse;
}

/**
 * Extract text from messages for pattern matching.
 */
function extractPromptText(options: LanguageModelV2CallOptions): string {
    const messages = options.prompt;
    if (!messages || !Array.isArray(messages)) {
        return "";
    }

    return messages
        .map((msg) => {
            if (Array.isArray(msg.content)) {
                return msg.content
                    .filter(
                        (part): part is { type: "text"; text: string } =>
                            typeof part === "object" &&
                            part !== null &&
                            part.type === "text" &&
                            "text" in part
                    )
                    .map((part) => (part as { text: string }).text)
                    .join(" ");
            }
            return "";
        })
        .join(" ");
}

/**
 * Create stream chunks in V2 format for simulateReadableStream.
 *
 * @param responseText - The full response text to chunk
 * @param chunkSize - Size of each text chunk (default: 10)
 * @returns Array of LanguageModelV2StreamPart chunks
 */
function createStreamChunks(
    responseText: string,
    chunkSize = 10
): LanguageModelV2StreamPart[] {
    const partId = `part-${Date.now()}`;
    const chunks: LanguageModelV2StreamPart[] = [];

    // Add text-start
    chunks.push({
        type: "text-start",
        id: partId,
    });

    // Add text-delta chunks
    if (globalConfig.simulateStreaming) {
        for (let i = 0; i < responseText.length; i += chunkSize) {
            chunks.push({
                type: "text-delta",
                id: partId,
                delta: responseText.slice(i, i + chunkSize),
            });
        }
    } else {
        // Single chunk for non-streaming mode
        chunks.push({
            type: "text-delta",
            id: partId,
            delta: responseText,
        });
    }

    // Add text-end
    chunks.push({
        type: "text-end",
        id: partId,
    });

    // Add finish
    chunks.push({
        type: "finish",
        finishReason: "stop",
        usage: {
            inputTokens: 10,
            outputTokens: responseText.length,
            totalTokens: responseText.length + 10,
        },
    });

    return chunks;
}

/**
 * Mock Language Model implementation.
 *
 * Custom implementation that conforms to LanguageModelV2 spec
 * without requiring 'ai/test' (which depends on msw).
 */
export type MockLanguageModel = LanguageModelV2;

/**
 * Check if mock AI should be used.
 *
 * @returns true if USE_MOCK_AI environment variable is set to 'true'
 */
export function shouldUseMockAI(): boolean {
    return process.env.USE_MOCK_AI === "true";
}

/**
 * Create a mock language model instance.
 *
 * Custom implementation that conforms to LanguageModelV2 interface
 * without requiring 'ai/test' or 'msw' dependencies.
 *
 * Uses `simulateReadableStream` from 'ai' for streaming responses.
 *
 * @param modelId - Optional model ID for the mock
 * @returns LanguageModelV2 instance
 *
 * @example
 * ```ts
 * const model = createMockModel('gpt-4');
 * const response = await generateText({ model, prompt: 'Hello' });
 * ```
 */
export function createMockModel(modelId = "mock-model"): LanguageModelV2 {
    return {
        specificationVersion: "v2" as const,
        provider: "mock",
        modelId,
        supportedUrls: {},

        async doGenerate(options: LanguageModelV2CallOptions) {
            const promptText = extractPromptText(options);
            const responseText = getResponseForPrompt(promptText);

            // Add simulated delay
            if (globalConfig.delay > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, globalConfig.delay)
                );
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: responseText,
                    },
                ],
                finishReason: "stop" as const,
                usage: {
                    inputTokens: promptText.length,
                    outputTokens: responseText.length,
                    totalTokens: promptText.length + responseText.length,
                },
                warnings: [],
            };
        },

        async doStream(options: LanguageModelV2CallOptions) {
            const promptText = extractPromptText(options);
            const responseText = getResponseForPrompt(promptText);
            const chunks = createStreamChunks(responseText);

            return {
                stream: simulateReadableStream({
                    chunks,
                    chunkDelayInMs: globalConfig.simulateStreaming
                        ? Math.max(1, globalConfig.delay / 10)
                        : null,
                    initialDelayInMs:
                        globalConfig.delay > 0 ? globalConfig.delay : null,
                }),
            };
        },
    };
}

/**
 * Get the appropriate model based on environment.
 *
 * Use this in your AI code to automatically switch between
 * real and mock models based on the USE_MOCK_AI env var.
 *
 * @param realModelFactory - Factory function to create the real model
 * @param mockModelId - Optional model ID for the mock
 * @returns Either the real model or a mock model
 *
 * @example
 * ```ts
 * const model = getModelWithMockFallback(
 *   () => getOpenAI()('gpt-4'),
 *   'gpt-4'
 * );
 * ```
 */
export function getModelWithMockFallback<T extends LanguageModelV2>(
    realModelFactory: () => T,
    mockModelId?: string
): T | LanguageModelV2 {
    if (shouldUseMockAI()) {
        return createMockModel(mockModelId);
    }
    return realModelFactory();
}
