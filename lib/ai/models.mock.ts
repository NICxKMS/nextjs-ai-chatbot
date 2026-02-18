/**
 * Mock Models for Test Environment
 *
 * Provides mock language models for testing purposes.
 * Used when PLAYWRIGHT_TEST_BASE_URL or CI environment is detected.
 *
 * @module lib/ai/models.mock
 */

import type { MockLanguageModelV2 } from "ai/test"

/**
 * Creates a mock language model for testing.
 * Returns predictable responses without making actual API calls.
 */
function createMockModel(): MockLanguageModelV2 {
	return {
		specificationVersion: "v2",
		provider: "mock",
		modelId: "mock-model",
		defaultObjectGenerationMode: "tool",
		supportedUrls: () => [],
		supportsImageUrls: false,
		supportsStructuredOutputs: false,
		doGenerate: async () => ({
			rawCall: { rawPrompt: null, rawSettings: {} },
			finishReason: "stop",
			usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
			content: [{ type: "text", text: "Hello, world!" }],
			warnings: [],
		}),
		doStream: async () => ({
			stream: new ReadableStream({
				start(controller) {
					controller.enqueue({
						type: "text-delta",
						id: "mock-id",
						delta: "Mock response",
					})
					controller.close()
				},
			}),
			rawCall: { rawPrompt: null, rawSettings: {} },
		}),
	} as unknown as MockLanguageModelV2
}

/**
 * Mock chat model for testing.
 */
export const mockChatModel = createMockModel()

/**
 * Mock reasoning model for testing.
 */
export const mockReasoningModel = createMockModel()

/**
 * Mock title model for testing.
 */
export const mockTitleModel = createMockModel()

/**
 * Mock artifact model for testing.
 */
export const mockArtifactModel = createMockModel()
