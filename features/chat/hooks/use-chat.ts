/**
 * Chat Hook
 *
 * Main chat state management hook. Wraps AI SDK's useChat with custom
 * state management, model selection, and streaming handling.
 *
 * @module features/chat/hooks/use-chat
 */

"use client"

import { useChat as useAIChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useCallback, useEffect, useRef, useState } from "react"
import type { AppUsage, Attachment, ChatMessage } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useChat hook
 */
export interface UseChatOptions {
	/** Chat ID */
	chatId: string
	/** Initial messages to display */
	initialMessages?: ChatMessage[]
	/** AI model to use */
	model: string
	/** Visibility type */
	visibilityType?: "public" | "private"
	/** Callback when messages change */
	onMessagesChange?: (messages: ChatMessage[]) => void
	/** Callback on error */
	onError?: (error: Error) => void
	/** Callback on usage data */
	onUsage?: (usage: AppUsage) => void
	/** API endpoint for chat */
	api?: string
	/** Throttle time for streaming updates */
	throttle?: number
}

/**
 * Return type for useChat hook
 */
export interface UseChatReturn {
	/** Current messages */
	messages: ChatMessage[]
	/** Set messages manually */
	setMessages: (messages: ChatMessage[]) => void
	/** Send a new message */
	sendMessage: (message: {
		content: string
		attachments?: Attachment[]
	}) => Promise<void>
	/** Whether AI is generating response */
	status: "ready" | "submitted" | "streaming" | "error"
	/** Stop current generation */
	stop: () => void
	/** Regenerate the last response */
	regenerate: () => Promise<void>
	/** Current error */
	error: Error | null
	/** Clear error state */
	clearError: () => void
	/** Current model ID */
	modelId: string
	/** Set current model ID */
	setModelId: (modelId: string) => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Main hook for chat state management
 *
 * Wraps AI SDK's useChat hook with additional features:
 * - Model selection state
 * - Message persistence callbacks
 * - Error handling
 * - Attachment support
 * - Usage tracking
 *
 * @param options - Hook configuration options
 * @returns Chat state and actions
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   sendMessage,
 *   status,
 *   stop,
 *   modelId,
 *   setModelId
 * } = useChat({
 *   chatId: 'chat-123',
 *   model: 'gpt-4',
 *   onMessagesChange: (msgs) => console.log('Messages updated:', msgs)
 * })
 *
 * // Send a message
 * await sendMessage({ content: 'Hello!' })
 *
 * // Stop generation
 * if (status === 'streaming') stop()
 * ```
 */
export function useChat(options: UseChatOptions): UseChatReturn {
	const {
		chatId,
		initialMessages = [],
		model,
		visibilityType = "private",
		onMessagesChange,
		onError,
		onUsage,
		api = "/api/chat",
		throttle = 100,
	} = options

	// Model selection state
	const [modelId, setModelId] = useState(model)
	const modelIdRef = useRef(modelId)

	// Sync ref with state
	useEffect(() => {
		modelIdRef.current = modelId
	}, [modelId])

	// Use AI SDK's useChat hook
	const {
		messages,
		setMessages,
		sendMessage: aiSendMessage,
		status,
		stop,
		regenerate,
		error: chatError,
		clearError,
	} = useAIChat<ChatMessage>({
		id: chatId,
		messages: initialMessages,
		experimental_throttle: throttle,
		generateId: () => crypto.randomUUID(),
		transport: new DefaultChatTransport({
			api,
			prepareSendMessagesRequest(request) {
				return {
					body: {
						id: request.id,
						message: request.messages.at(-1),
						selectedChatModel: modelIdRef.current,
						selectedVisibilityType: visibilityType,
						...request.body,
					},
				}
			},
		}),
		onData: (dataPart) => {
			// Handle usage data
			if (dataPart.type === "data-usage" && onUsage) {
				onUsage(dataPart.data as AppUsage)
			}
		},
	})

	// Notify on messages change
	useEffect(() => {
		onMessagesChange?.(messages as ChatMessage[])
	}, [messages, onMessagesChange])

	// Handle errors
	useEffect(() => {
		if (chatError && onError) {
			onError(chatError)
		}
	}, [chatError, onError])

	// Custom sendMessage with attachment support
	const sendMessage = useCallback(
		async (message: { content: string; attachments?: Attachment[] }) => {
			// For now, send without attachments
			// Attachment handling would be implemented with multimodal input
			await aiSendMessage({
				text: message.content,
			})
		},
		[aiSendMessage],
	)

	return {
		messages: messages as ChatMessage[],
		setMessages: (msgs) => setMessages(msgs),
		sendMessage,
		status,
		stop,
		regenerate,
		error: chatError ?? null,
		clearError,
		modelId,
		setModelId,
	}
}
