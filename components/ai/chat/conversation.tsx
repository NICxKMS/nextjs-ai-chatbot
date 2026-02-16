/**
 * AI Conversation Wrapper Component
 *
 * Project wrapper for ai-elements Conversation primitive that adds:
 * - Message list rendering
 * - Auto-scroll behavior
 * - Loading state handling
 * - Empty state display
 *
 * @module components/ai/chat/conversation
 */

"use client"

import type { UIMessage } from "ai"
import { useCallback, useEffect, useRef } from "react"
import {
	Conversation as AIConversationBase,
	type ConversationProps as AIConversationProps,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { cn } from "@/lib/utils"
import { AIMessage, AIThinkingMessage } from "./message"

/**
 * Vote type for message voting
 */
export interface MessageVote {
	isUpvoted?: boolean
	isDownvoted?: boolean
}

/**
 * Props for the AIConversation wrapper component
 */
export interface AIConversationWrapperProps
	extends Omit<AIConversationProps, "children"> {
	/** Array of messages to display */
	messages: UIMessage[]
	/** Map of message IDs to their votes */
	votes?: Map<string, MessageVote>
	/** Chat ID for context */
	chatId: string
	/** Whether the conversation is currently loading */
	isLoading?: boolean
	/** Whether the conversation is in readonly mode */
	isReadonly?: boolean
	/** Whether to show the thinking indicator */
	showThinking?: boolean
	/** Additional class names */
	className?: string
}

/**
 * AI Conversation wrapper component
 *
 * Provides a scrollable conversation container with:
 * - Auto-scroll to bottom on new messages
 * - Thinking indicator during generation
 * - Message rendering with vote display
 */
export const AIConversation = ({
	messages,
	votes = new Map(),
	chatId,
	isLoading = false,
	isReadonly = false,
	showThinking = true,
	className,
	...props
}: AIConversationWrapperProps) => {
	const lastMessageRef = useRef<string | null>(null)

	// Track last message for scroll behavior
	useEffect(() => {
		if (messages.length > 0) {
			const lastMessage = messages[messages.length - 1]
			if (lastMessage && lastMessage.id !== lastMessageRef.current) {
				lastMessageRef.current = lastMessage.id
			}
		}
	}, [messages])

	return (
		<AIConversationBase
			className={cn("flex flex-col", className)}
			{...props}
		>
			<ConversationContent className="flex flex-col gap-4 py-4">
				{messages.map((message, index) => {
					const isLastMessage = index === messages.length - 1
					const vote = votes.get(message.id)

					return (
						<AIMessage
							key={message.id}
							message={message}
							{...(vote ? { vote } : {})}
							isLoading={isLoading && isLastMessage}
							chatId={chatId}
							isReadonly={isReadonly}
							requiresScrollPadding={isLastMessage && isLoading}
						/>
					)
				})}

				{/* Show thinking indicator when loading with no messages */}
				{isLoading && showThinking && messages.length === 0 && (
					<AIThinkingMessage />
				)}
			</ConversationContent>

			{/* Scroll to bottom button */}
			<ConversationScrollButton />
		</AIConversationBase>
	)
}

/**
 * Hook for managing conversation scroll behavior
 */
export const useConversationScroll = () => {
	const scrollRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(
		(behavior: ScrollBehavior = "smooth") => {
			scrollRef.current?.scrollIntoView({ behavior })
		},
		[],
	)

	const scrollToMessage = useCallback((messageId: string) => {
		const element = document.querySelector(
			`[data-message-id="${messageId}"]`,
		)
		element?.scrollIntoView({ behavior: "smooth", block: "center" })
	}, [])

	return {
		scrollRef,
		scrollToBottom,
		scrollToMessage,
	}
}

export type { AIConversationProps }
