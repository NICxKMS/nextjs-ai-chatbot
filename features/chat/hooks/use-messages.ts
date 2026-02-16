/**
 * Messages Hook
 *
 * Manages message list state and scroll behavior for chat messages.
 * Integrates with AI SDK's useChat status for streaming state.
 *
 * @module features/chat/hooks/use-messages
 */

"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import { useEffect, useState } from "react"
import type { ChatMessage } from "../types"
import { useScrollToBottom } from "./use-scroll-to-bottom"

// =============================================================================
// Types
// =============================================================================

/**
 * Status type from AI SDK useChat hook
 */
type ChatStatus = UseChatHelpers<ChatMessage>["status"]

/**
 * Options for useMessages hook
 */
export interface UseMessagesOptions {
	/** Current chat status from useChat hook */
	status: ChatStatus
}

/**
 * Return type for useMessages hook
 */
export interface UseMessagesReturn {
	/** Ref to the scroll container */
	containerRef: React.RefObject<HTMLDivElement | null>
	/** Ref to the end element for scrolling */
	endRef: React.RefObject<HTMLDivElement | null>
	/** Whether the user is at the bottom of the chat */
	isAtBottom: boolean
	/** Function to scroll to bottom */
	scrollToBottom: (behavior?: ScrollBehavior) => void
	/** Callback when viewport enters the end element */
	onViewportEnter: () => void
	/** Callback when viewport leaves the end element */
	onViewportLeave: () => void
	/** Whether a message has been sent in this session */
	hasSentMessage: boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing message list state and scroll behavior
 *
 * Provides:
 * - Scroll container management
 * - Auto-scroll on new messages
 * - Message sent state tracking
 *
 * @param options - Hook options including chat status
 * @returns Message state and scroll utilities
 *
 * @example
 * ```tsx
 * const { containerRef, endRef, scrollToBottom, isAtBottom } = useMessages({
 *   status: chatStatus
 * })
 *
 * return (
 *   <div ref={containerRef} className="overflow-y-auto">
 *     {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *     <div ref={endRef} />
 *   </div>
 * )
 * ```
 */
export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
	const { status } = options

	const {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		onViewportEnter,
		onViewportLeave,
	} = useScrollToBottom()

	const [hasSentMessage, setHasSentMessage] = useState(false)

	// Track when a message has been sent
	useEffect(() => {
		if (status === "submitted") {
			setHasSentMessage(true)
		}
	}, [status])

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		onViewportEnter,
		onViewportLeave,
		hasSentMessage,
	}
}
