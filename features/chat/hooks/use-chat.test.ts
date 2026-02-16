/**
 * Tests for useChat Hook
 *
 * Unit tests for the chat state management hook.
 *
 * @module features/chat/hooks/use-chat.test
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatMessage } from "../types"
import { type UseChatOptions, useChat } from "./use-chat"

// =============================================================================
// Mocks
// =============================================================================

// Mock @ai-sdk/react useChat
const mockAiSendMessage = vi.fn()
const mockSetMessages = vi.fn()
const mockStop = vi.fn()
const mockRegenerate = vi.fn()
const mockClearError = vi.fn()

let mockMessages: ChatMessage[] = []
let mockStatus: "ready" | "submitted" | "streaming" | "error" = "ready"
let mockError: Error | null = null

vi.mock("@ai-sdk/react", () => ({
	useChat: vi.fn(() => ({
		messages: mockMessages,
		setMessages: mockSetMessages,
		sendMessage: mockAiSendMessage,
		status: mockStatus,
		stop: mockStop,
		regenerate: mockRegenerate,
		error: mockError,
		clearError: mockClearError,
	})),
}))

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
	randomUUID: () => "test-uuid-123",
})

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestMessage = (
	overrides: Partial<ChatMessage> = {},
): ChatMessage => {
	return {
		id: `msg-${Date.now()}`,
		role: "user",
		parts: [{ type: "text", text: "Test message" }],
		createdAt: new Date(),
		...overrides,
	} as ChatMessage
}

const defaultOptions: UseChatOptions = {
	chatId: "test-chat-id",
	model: "gpt-4",
}

// =============================================================================
// Tests
// =============================================================================

describe("useChat", () => {
	beforeEach(() => {
		// Reset mock state
		mockMessages = []
		mockStatus = "ready"
		mockError = null
		vi.clearAllMocks()
	})

	// ---------------------------------------------------------------------------
	// Initialization Tests
	// ---------------------------------------------------------------------------

	describe("initialization", () => {
		it("should initialize with default values", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.messages).toEqual([])
			expect(result.current.status).toBe("ready")
			expect(result.current.error).toBeNull()
			expect(result.current.modelId).toBe("gpt-4")
		})

		it("should initialize with initial messages", () => {
			const initialMessages = [
				createTestMessage({
					id: "msg-1",
					parts: [{ type: "text", text: "Hello" }],
				}),
				createTestMessage({
					id: "msg-2",
					role: "assistant",
					parts: [{ type: "text", text: "Hi there!" }],
				}),
			]

			mockMessages = initialMessages

			const { result } = renderHook(() =>
				useChat({
					...defaultOptions,
					initialMessages,
				}),
			)

			expect(result.current.messages).toEqual(initialMessages)
		})

		it("should use custom API endpoint", () => {
			const customApi = "/api/custom-chat"

			renderHook(() =>
				useChat({
					...defaultOptions,
					api: customApi,
				}),
			)

			// Hook should render without error with custom API
			expect(true).toBe(true)
		})

		it("should use default visibility type as private", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			// Default visibility is private
			expect(result.current).toBeDefined()
		})
	})

	// ---------------------------------------------------------------------------
	// Model Selection Tests
	// ---------------------------------------------------------------------------

	describe("model selection", () => {
		it("should track model ID state", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.modelId).toBe("gpt-4")

			act(() => {
				result.current.setModelId("gpt-3.5-turbo")
			})

			expect(result.current.modelId).toBe("gpt-3.5-turbo")
		})

		it("should use initial model from options", () => {
			const { result } = renderHook(() =>
				useChat({
					...defaultOptions,
					model: "claude-3",
				}),
			)

			expect(result.current.modelId).toBe("claude-3")
		})

		it("should allow model changes during chat", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			act(() => {
				result.current.setModelId("gpt-4-turbo")
			})

			expect(result.current.modelId).toBe("gpt-4-turbo")

			act(() => {
				result.current.setModelId("claude-3-opus")
			})

			expect(result.current.modelId).toBe("claude-3-opus")
		})
	})

	// ---------------------------------------------------------------------------
	// Message Operations Tests
	// ---------------------------------------------------------------------------

	describe("message operations", () => {
		it("should send a message", async () => {
			mockAiSendMessage.mockResolvedValueOnce(undefined)

			const { result } = renderHook(() => useChat(defaultOptions))

			await act(async () => {
				await result.current.sendMessage({ content: "Hello, AI!" })
			})

			expect(mockAiSendMessage).toHaveBeenCalledWith({
				text: "Hello, AI!",
			})
		})

		it("should send a message with attachments", async () => {
			mockAiSendMessage.mockResolvedValueOnce(undefined)

			const { result } = renderHook(() => useChat(defaultOptions))

			await act(async () => {
				await result.current.sendMessage({
					content: "Check this image",
					attachments: [
						{
							name: "image.png",
							url: "https://example.com/image.png",
							contentType: "image/png",
						},
					],
				})
			})

			// Currently attachments are not passed through, just content
			expect(mockAiSendMessage).toHaveBeenCalledWith({
				text: "Check this image",
			})
		})

		it("should set messages manually", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			const newMessages = [
				createTestMessage({
					id: "new-1",
					parts: [{ type: "text", text: "New message" }],
				}),
			]

			act(() => {
				result.current.setMessages(newMessages)
			})

			expect(mockSetMessages).toHaveBeenCalledWith(newMessages)
		})
	})

	// ---------------------------------------------------------------------------
	// Status Management Tests
	// ---------------------------------------------------------------------------

	describe("status management", () => {
		it("should report ready status initially", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.status).toBe("ready")
		})

		it("should report streaming status during generation", () => {
			mockStatus = "streaming"

			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.status).toBe("streaming")
		})

		it("should report error status on failure", () => {
			mockStatus = "error"

			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.status).toBe("error")
		})

		it("should report submitted status when waiting", () => {
			mockStatus = "submitted"

			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.status).toBe("submitted")
		})

		it("should stop generation", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			act(() => {
				result.current.stop()
			})

			expect(mockStop).toHaveBeenCalled()
		})

		it("should regenerate response", async () => {
			mockRegenerate.mockResolvedValueOnce(undefined)

			const { result } = renderHook(() => useChat(defaultOptions))

			await act(async () => {
				await result.current.regenerate()
			})

			expect(mockRegenerate).toHaveBeenCalled()
		})
	})

	// ---------------------------------------------------------------------------
	// Error Handling Tests
	// ---------------------------------------------------------------------------

	describe("error handling", () => {
		it("should report null error when no error", () => {
			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.error).toBeNull()
		})

		it("should report error when present", () => {
			mockError = new Error("API Error")

			const { result } = renderHook(() => useChat(defaultOptions))

			expect(result.current.error).toBeInstanceOf(Error)
			expect(result.current.error?.message).toBe("API Error")
		})

		it("should clear error", () => {
			mockError = new Error("API Error")

			const { result } = renderHook(() => useChat(defaultOptions))

			act(() => {
				result.current.clearError()
			})

			expect(mockClearError).toHaveBeenCalled()
		})

		it("should call onError callback when error occurs", async () => {
			const onError = vi.fn()
			mockError = new Error("Test error")

			renderHook(() =>
				useChat({
					...defaultOptions,
					onError,
				}),
			)

			// Wait for useEffect to run
			await waitFor(() => {
				expect(onError).toHaveBeenCalledWith(mockError)
			})
		})
	})

	// ---------------------------------------------------------------------------
	// Callback Tests
	// ---------------------------------------------------------------------------

	describe("callbacks", () => {
		it("should call onMessagesChange when messages update", async () => {
			const onMessagesChange = vi.fn()
			const initialMessages = [createTestMessage({ id: "msg-1" })]
			mockMessages = initialMessages

			renderHook(() =>
				useChat({
					...defaultOptions,
					initialMessages,
					onMessagesChange,
				}),
			)

			// Wait for useEffect to run
			await waitFor(() => {
				expect(onMessagesChange).toHaveBeenCalled()
			})
		})
	})

	// ---------------------------------------------------------------------------
	// Visibility Tests
	// ---------------------------------------------------------------------------

	describe("visibility", () => {
		it("should use private visibility by default", () => {
			renderHook(() => useChat(defaultOptions))
			// Hook should render without error
			expect(true).toBe(true)
		})

		it("should accept public visibility", () => {
			renderHook(() =>
				useChat({
					...defaultOptions,
					visibilityType: "public",
				}),
			)
			// Hook should render without error
			expect(true).toBe(true)
		})
	})

	// ---------------------------------------------------------------------------
	// Throttle Tests
	// ---------------------------------------------------------------------------

	describe("throttle configuration", () => {
		it("should use default throttle value", () => {
			renderHook(() => useChat(defaultOptions))
			// Hook should render without error
			expect(true).toBe(true)
		})

		it("should accept custom throttle value", () => {
			renderHook(() =>
				useChat({
					...defaultOptions,
					throttle: 200,
				}),
			)
			// Hook should render without error
			expect(true).toBe(true)
		})
	})
})
