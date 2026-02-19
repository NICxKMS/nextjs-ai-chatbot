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
import { memo, useEffect, useMemo, useState } from "react"
import { Message, ThinkingMessage } from "@/features/chat/components/message"
import type { ChatMessage, UserVote } from "@/features/chat/types"
import { useScrollToBottom } from "@/hooks"
import { AnimatePresence, motion } from "@/lib/motion"
import type { ArtifactKind, ArtifactStatus } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ArtifactMessages component
 */
export interface ArtifactMessagesProps {
	/** Chat ID for context */
	chatId: string
	/** Active artifact/document ID */
	artifactDocumentId: string
	/** Active artifact title */
	artifactTitle: string
	/** Active artifact kind */
	artifactKind: ArtifactKind
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

interface ArtifactFilterContext {
	documentId: string
	title: string
	kind: ArtifactKind
}

function normalize(value: string): string {
	return value.trim().toLowerCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function messageReferencesArtifact(
	message: ChatMessage,
	context: ArtifactFilterContext,
): boolean {
	if (context.documentId === "init") {
		return true
	}

	const normalizedDocumentId = normalize(context.documentId)
	const normalizedTitle = normalize(context.title)
	const normalizedKind = normalize(context.kind)

	let hasMatchingTitle = false
	let hasMatchingKind = false

	const stack: unknown[] = [...(message.parts ?? [])]
	const visited = new Set<object>()

	while (stack.length > 0) {
		const current = stack.pop()

		if (!current) {
			continue
		}

		if (typeof current === "string") {
			if (normalize(current) === normalizedDocumentId) {
				return true
			}
			continue
		}

		if (Array.isArray(current)) {
			for (const item of current) {
				stack.push(item)
			}
			continue
		}

		if (!isRecord(current)) {
			continue
		}

		if (visited.has(current)) {
			continue
		}
		visited.add(current)

		const idValue =
			typeof current.documentId === "string"
				? current.documentId
				: typeof current.artifactId === "string"
					? current.artifactId
					: typeof current.id === "string"
						? current.id
						: null

		if (idValue && normalize(idValue) === normalizedDocumentId) {
			return true
		}

		if (
			typeof current.title === "string" &&
			normalizedTitle.length > 0 &&
			normalize(current.title) === normalizedTitle
		) {
			hasMatchingTitle = true
		}

		if (
			typeof current.kind === "string" &&
			normalize(current.kind) === normalizedKind
		) {
			hasMatchingKind = true
		}

		if (
			typeof current.type === "string" &&
			typeof current.data === "string"
		) {
			if (
				current.type === "data-id" &&
				normalize(current.data) === normalizedDocumentId
			) {
				return true
			}
			if (
				current.type === "data-title" &&
				normalizedTitle.length > 0 &&
				normalize(current.data) === normalizedTitle
			) {
				hasMatchingTitle = true
			}
			if (
				current.type === "data-kind" &&
				normalize(current.data) === normalizedKind
			) {
				hasMatchingKind = true
			}
		}

		for (const value of Object.values(current)) {
			stack.push(value)
		}
	}

	return hasMatchingTitle && hasMatchingKind
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
	artifactDocumentId,
	artifactTitle,
	artifactKind,
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

	const filteredMessages = useMemo(() => {
		const filterContext: ArtifactFilterContext = {
			documentId: artifactDocumentId,
			title: artifactTitle,
			kind: artifactKind,
		}

		const relatedIndexes = new Set<number>()

		for (const [index, message] of messages.entries()) {
			if (messageReferencesArtifact(message, filterContext)) {
				relatedIndexes.add(index)
				const previousMessage = messages[index - 1]
				if (index > 0 && previousMessage?.role === "user") {
					relatedIndexes.add(index - 1)
				}
			}
		}

		if (relatedIndexes.size === 0) {
			return messages
		}

		return messages.filter((_message, index) => relatedIndexes.has(index))
	}, [artifactDocumentId, artifactKind, artifactTitle, messages])

	return (
		<div
			className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20"
			ref={messagesContainerRef}
		>
			{filteredMessages.map((message, index) => (
				<Message
					chatId={chatId}
					isLoading={
						status === "streaming" &&
						index === filteredMessages.length - 1
					}
					isReadonly={isReadonly}
					key={message.id}
					message={message}
					regenerate={regenerate}
					requiresScrollPadding={
						hasSentMessage && index === filteredMessages.length - 1
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

	if (prevProps.artifactDocumentId !== nextProps.artifactDocumentId) {
		return false
	}

	if (prevProps.artifactTitle !== nextProps.artifactTitle) {
		return false
	}

	if (prevProps.artifactKind !== nextProps.artifactKind) {
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
