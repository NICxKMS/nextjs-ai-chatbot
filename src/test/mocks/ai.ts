/**
 * AI SDK Mocks for Testing
 *
 * Provides mock implementations of AI SDK operations for unit tests.
 * Returns deterministic responses for consistent test results.
 *
 * @module src/test/mocks/ai
 */

import { vi } from "vitest"

// =============================================================================
// Mock Stream Types
// =============================================================================

/**
 * Mock stream text chunk
 */
export interface MockStreamChunk {
	type: "text-delta" | "finish" | "error"
	textDelta?: string
	finishReason?: "stop" | "length" | "content-filter"
	error?: string
}

/**
 * Mock stream result
 */
export interface MockStreamResult {
	text: string
	finishReason: "stop" | "length" | "content-filter"
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
}

// =============================================================================
// Deterministic Response Fixtures
// =============================================================================

/**
 * Predefined AI responses for different artifact types
 */
export const aiResponseFixtures = {
	text: {
		content: "This is a sample text response from the AI assistant.",
		artifact: {
			kind: "text" as const,
			title: "Sample Document",
			content: "# Sample Document\n\nThis is sample content for testing.",
		},
	},
	code: {
		content: "```javascript\nconsole.log('Hello, World!');\n```",
		artifact: {
			kind: "code" as const,
			title: "Sample Code",
			content:
				"// Sample code\nfunction hello() {\n  return 'Hello, World!';\n}",
		},
	},
	image: {
		content: "![Generated Image](https://example.com/image.png)",
		artifact: {
			kind: "image" as const,
			title: "Sample Image",
			content: "https://example.com/generated-image.png",
		},
	},
	sheet: {
		content: "Created a spreadsheet with sample data.",
		artifact: {
			kind: "sheet" as const,
			title: "Sample Spreadsheet",
			content: "A,B,C\n1,2,3\n4,5,6",
		},
	},
	chat: {
		greeting: "Hello! I'm your AI assistant. How can I help you today?",
		acknowledgment: "I understand. Let me help you with that.",
		clarification: "Could you please provide more details?",
		completion: "I've completed the task. Is there anything else you need?",
	},
}

// =============================================================================
// Mock streamText Function
// =============================================================================

/**
 * Create a mock streamText function that returns deterministic responses
 */
export function createMockStreamText() {
	return vi.fn(async function* mockStreamText(options: {
		prompt?: string
		messages?: Array<{ role: string; content: string }>
		system?: string
	}): AsyncGenerator<MockStreamChunk, MockStreamResult, unknown> {
		// Determine response based on prompt content
		let responseText = aiResponseFixtures.text.content
		const prompt =
			options.prompt ??
			options.messages?.map((m) => m.content).join(" ") ??
			""

		// Check for artifact creation patterns
		if (
			prompt.toLowerCase().includes("create") ||
			prompt.toLowerCase().includes("generate")
		) {
			if (prompt.toLowerCase().includes("code")) {
				responseText = aiResponseFixtures.code.content
			} else if (prompt.toLowerCase().includes("image")) {
				responseText = aiResponseFixtures.image.content
			} else if (
				prompt.toLowerCase().includes("spreadsheet") ||
				prompt.toLowerCase().includes("sheet")
			) {
				responseText = aiResponseFixtures.sheet.content
			}
		}

		// Simulate streaming with small chunks
		const words = responseText.split(" ")
		for (let i = 0; i < words.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 10))
			yield {
				type: "text-delta" as const,
				textDelta: (i === 0 ? "" : " ") + words[i],
			}
		}

		// Yield finish event
		yield {
			type: "finish" as const,
			finishReason: "stop" as const,
		}

		return {
			text: responseText,
			finishReason: "stop" as const,
			usage: {
				promptTokens: 50,
				completionTokens: words.length,
				totalTokens: 50 + words.length,
			},
		}
	})
}

// =============================================================================
// Mock generateText Function
// =============================================================================

/**
 * Create a mock generateText function that returns deterministic responses
 */
export function createMockGenerateText() {
	return vi.fn(
		async (options: {
			prompt?: string
			messages?: Array<{ role: string; content: string }>
			system?: string
		}): Promise<{
			text: string
			usage: { promptTokens: number; completionTokens: number }
		}> => {
			const prompt =
				options.prompt ??
				options.messages?.map((m) => m.content).join(" ") ??
				""

			// Return appropriate response based on prompt
			let responseText = aiResponseFixtures.text.content

			if (prompt.toLowerCase().includes("code")) {
				responseText = aiResponseFixtures.code.content
			} else if (prompt.toLowerCase().includes("image")) {
				responseText = aiResponseFixtures.image.content
			} else if (
				prompt.toLowerCase().includes("sheet") ||
				prompt.toLowerCase().includes("spreadsheet")
			) {
				responseText = aiResponseFixtures.sheet.content
			} else if (
				prompt.toLowerCase().includes("hello") ||
				prompt.toLowerCase().includes("hi")
			) {
				responseText = aiResponseFixtures.chat.greeting
			}

			return {
				text: responseText,
				usage: {
					promptTokens: 50,
					completionTokens: 20,
				},
			}
		},
	)
}

// =============================================================================
// Mock Tool Calls
// =============================================================================

/**
 * Mock tool definitions
 */
export const mockTools = {
	weather: {
		description: "Get current weather for a location",
		parameters: {
			type: "object",
			properties: {
				location: { type: "string", description: "City name" },
			},
			required: ["location"],
		},
		execute: vi.fn(async ({ location }: { location: string }) => ({
			location,
			temperature: 72,
			condition: "sunny",
			humidity: 45,
		})),
	},
	createDocument: {
		description: "Create a new document/artifact",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				kind: {
					type: "string",
					enum: ["text", "code", "image", "sheet"],
				},
				content: { type: "string" },
			},
			required: ["title", "kind"],
		},
		execute: vi.fn(
			async (params: {
				title: string
				kind: string
				content?: string
			}) => ({
				id: `artifact-${Date.now()}`,
				title: params.title,
				kind: params.kind,
				content: params.content ?? "",
				createdAt: new Date().toISOString(),
			}),
		),
	},
	updateDocument: {
		description: "Update an existing document/artifact",
		parameters: {
			type: "object",
			properties: {
				documentId: { type: "string" },
				content: { type: "string" },
			},
			required: ["documentId", "content"],
		},
		execute: vi.fn(
			async (params: { documentId: string; content: string }) => ({
				id: params.documentId,
				content: params.content,
				updatedAt: new Date().toISOString(),
			}),
		),
	},
	requestSuggestions: {
		description: "Request suggestions for document improvements",
		parameters: {
			type: "object",
			properties: {
				documentId: { type: "string" },
			},
			required: ["documentId"],
		},
		execute: vi.fn(async ({ documentId }: { documentId: string }) => ({
			documentId,
			suggestions: [
				{
					id: "suggestion-1",
					text: "Add more detail to the introduction",
				},
				{ id: "suggestion-2", text: "Consider adding code examples" },
			],
		})),
	},
}

/**
 * Create mock tool execution function
 */
export function createMockExecuteTools() {
	return vi.fn(async (toolName: string, params: Record<string, unknown>) => {
		const tool = mockTools[toolName as keyof typeof mockTools]
		if (!tool) {
			throw new Error(`Unknown tool: ${toolName}`)
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (tool.execute as any)(params)
	})
}

// =============================================================================
// Mock AI Model Registry
// =============================================================================

/**
 * Mock model registry with predefined models
 */
export const mockModelRegistry = {
	"openai:gpt-4": {
		id: "gpt-4",
		provider: "openai",
		name: "GPT-4",
		contextWindow: 128000,
		supportsStreaming: true,
		supportsTools: true,
	},
	"openai:gpt-3.5-turbo": {
		id: "gpt-3.5-turbo",
		provider: "openai",
		name: "GPT-3.5 Turbo",
		contextWindow: 16385,
		supportsStreaming: true,
		supportsTools: true,
	},
	"google:gemini-pro": {
		id: "gemini-pro",
		provider: "google",
		name: "Gemini Pro",
		contextWindow: 32000,
		supportsStreaming: true,
		supportsTools: true,
	},
	"xai:grok-beta": {
		id: "grok-beta",
		provider: "xai",
		name: "Grok Beta",
		contextWindow: 128000,
		supportsStreaming: true,
		supportsTools: true,
	},
}

/**
 * Create mock model lookup function
 */
export function createMockGetModel() {
	return vi.fn((modelId: string) => {
		const model =
			mockModelRegistry[modelId as keyof typeof mockModelRegistry]
		if (!model) {
			throw new Error(`Unknown model: ${modelId}`)
		}
		return model
	})
}

// =============================================================================
// Mock Embeddings
// =============================================================================

/**
 * Create mock embedding function
 */
export function createMockEmbedText() {
	return vi.fn(async (text: string): Promise<number[]> => {
		// Return deterministic embedding based on text hash
		const hash = text
			.split("")
			.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		const embedding = new Array(1536).fill(0).map((_, i) => {
			// Generate pseudo-random but deterministic values
			const value = Math.sin(hash + i) * 0.1
			return Math.round(value * 1000) / 1000
		})
		return embedding
	})
}

// =============================================================================
// Mock AI Provider
// =============================================================================

/**
 * Create a complete mock AI provider
 */
export function createMockAIProvider() {
	return {
		streamText: createMockStreamText(),
		generateText: createMockGenerateText(),
		executeTools: createMockExecuteTools(),
		getModel: createMockGetModel(),
		embedText: createMockEmbedText(),
		tools: mockTools,
		responseFixtures: aiResponseFixtures,
	}
}

// =============================================================================
// Reset Utilities
// =============================================================================

/**
 * Reset all AI mock call counts
 */
export function resetAIMocks(): void {
	Object.values(mockTools).forEach((tool) => {
		tool.execute.mockClear()
	})
}

// =============================================================================
// Mock Module Exports
// =============================================================================

/**
 * Mock the AI SDK module
 */
export function mockAISDKModule() {
	return {
		streamText: createMockStreamText(),
		generateText: createMockGenerateText(),
		executeTools: createMockExecuteTools(),
		getModel: createMockGetModel(),
		embedText: createMockEmbedText(),
		tools: mockTools,
		responseFixtures: aiResponseFixtures,
		createMockAIProvider,
		resetAIMocks,
	}
}
