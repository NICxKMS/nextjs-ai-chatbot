/**
 * Artifact Messages Component
 *
 * Displays messages within the artifact panel context.
 * Shows a filtered view of messages related to the current artifact.
 *
 * @module features/artifact/components/artifact-messages
 */
"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import equal from "fast-deep-equal"
import { memo, useEffect, useState } from "react"
import { Message, ThinkingMessage } from "@/features/chat/components/message"
import type { ChatMessage, UserVote } from "@/features/chat/types"
import { useScrollToBottom } from "@/hooks"
import { AnimatePresence, motion } from "@/lib/motion"
import type { ArtifactStatus } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ArtifactMessages component
 */
export interface ArtifactMessagesProps {
	/** Chat ID for context */
	chatId: string
	/** Chat status from useChat */
	status: UseChatHelpers<ChatMessage>["status"]
	/** User votes on messages */
	votes: UserVote[] | undefined
	/** Messages to display */
	messages: ChatMessage[]
	/** Set messages function from useChat */
	setMessages: UseChatHelpers<ChatMessage>["setMessages"]
	/** Regenerate function from useChat */
	regenerate: UseChatHelpers<ChatMessage>["regenerate"]
	/** Whether in read-only mode */
	isReadonly: boolean
	/** Current artifact status */
	artifactStatus: ArtifactStatus
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pure artifact messages component (internal implementation)
 *
 * Features:
 * - Scroll management with useScrollToBottom hook
 * - Thinking message during submission
 * - Memoized for performance with custom comparison
 */
function PureArtifactMessages({
	chatId,
	status,
	votes,
	messages,
	setMessages,
	regenerate,
	isReadonly,
}: ArtifactMessagesProps) {
	const {
		containerRef: messagesContainerRef,
		endRef: messagesEndRef,
		onViewportEnter,
		onViewportLeave,
	} = useScrollToBottom()

	const [hasSentMessage, setHasSentMessage] = useState(false)

	// Track when user sends a message
	useEffect(() => {
		if (status === "submitted") {
			setHasSentMessage(true)
		}
	}, [status])

	return (
		<div
			className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20"
			ref={messagesContainerRef}
		>
			{messages.map((message, index) => (
				<Message
					chatId={chatId}
					isLoading={
						status === "streaming" && index === messages.length - 1
					}
					isReadonly={isReadonly}
					key={message.id}
					message={message}
					regenerate={regenerate}
					requiresScrollPadding={
						hasSentMessage && index === messages.length - 1
					}
					setMessages={setMessages}
					vote={
						votes
							? votes.find(
									(vote) => vote.messageId === message.id,
								)
							: undefined
					}
				/>
			))}

			<AnimatePresence mode="wait">
				{status === "submitted" && <ThinkingMessage key="thinking" />}
			</AnimatePresence>

			<motion.div
				className="min-h-[24px] min-w-[24px] shrink-0"
				onViewportEnter={onViewportEnter}
				onViewportLeave={onViewportLeave}
				ref={messagesEndRef}
			/>
		</div>
	)
}

/**
 * Custom comparison function for memoization
 *
 * Optimizes re-renders by:
 * - Skipping updates when artifact is streaming (both prev and next)
 * - Only re-rendering when status, messages, or votes change
 */
function areEqual(
	prevProps: ArtifactMessagesProps,
	nextProps: ArtifactMessagesProps,
): boolean {
	// Skip re-renders when artifact is streaming in both states
	if (
		prevProps.artifactStatus === "streaming" &&
		nextProps.artifactStatus === "streaming"
	) {
		return true
	}

	// Status changed
	if (prevProps.status !== nextProps.status) {
		return false
	}

	// Both have status (transitioning)
	if (prevProps.status && nextProps.status) {
		return false
	}

	// Message count changed
	if (prevProps.messages.length !== nextProps.messages.length) {
		return false
	}

	// Votes changed
	if (!equal(prevProps.votes, nextProps.votes)) {
		return false
	}

	return true
}

/**
 * ArtifactMessages component with memoization for performance
 *
 * Displays messages within the artifact panel context.
 * Uses custom memoization to prevent unnecessary re-renders during streaming.
 */
export const ArtifactMessages = memo(PureArtifactMessages, areEqual)

ArtifactMessages.displayName = "ArtifactMessages"
