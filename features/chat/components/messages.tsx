/**
 * Messages Component
 *
 * Virtualized message list component using Virtuoso for performance.
 * Handles scroll management, auto-scroll during streaming, and message grouping.
 *
 * @module features/chat/components
 */

import type { UseChatHelpers } from "@ai-sdk/react"
import equal from "fast-deep-equal"
import { AlertCircle, ArrowDownIcon, RotateCcw } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { VirtuosoHandle } from "react-virtuoso"
import { Virtuoso } from "react-virtuoso"
import { useSettingsSnapshot } from "@/features/settings"
import { AnimatePresence, motion } from "@/lib/motion"
import type { ChatMessage, UserVote } from "../types"
import { Message, ThinkingMessage } from "./message"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Messages component
 */
export interface MessagesProps {
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
	/** Whether user is a guest */
	isGuest: boolean
	/** Whether artifact panel is visible */
	isArtifactVisible: boolean
	/** Selected model ID */
	selectedModelId: string
	/** Chat error if any */
	chatError: Error | undefined
	/** Clear error function */
	clearError: (() => void) | undefined
}

// =============================================================================
// Component
// =============================================================================

/**
 * Pure messages component (internal implementation)
 *
 * Features:
 * - Virtualized rendering with Virtuoso for performance with large message lists
 * - Auto-scroll behavior during streaming
 * - Scroll-to-bottom button when scrolled up
 * - Error state with retry button
 * - Empty state with greeting
 */
function PureMessages({
	chatId,
	status,
	votes,
	messages,
	setMessages,
	regenerate,
	isReadonly,
	isGuest,
	chatError,
	clearError,
}: MessagesProps) {
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const [isAtBottom, setIsAtBottom] = useState(true)
	const [hasSentMessage, setHasSentMessage] = useState(false)
	const [initialTopMostItemIndex, setInitialTopMostItemIndex] = useState<
		number | undefined
	>(undefined)
	const [listAnimationState, setListAnimationState] = useState<
		"idle" | "enter" | "exit"
	>("idle")
	const previousRenderableCountRef = useRef(messages.length)
	const animationResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	)
	const { autoScroll } = useSettingsSnapshot()

	const scrollStateKey = `chat-scroll-index:${chatId}`

	useEffect(() => {
		if (typeof window === "undefined") {
			return
		}

		const savedIndexRaw = window.sessionStorage.getItem(scrollStateKey)
		if (!savedIndexRaw) {
			setInitialTopMostItemIndex(undefined)
			return
		}

		const savedIndex = Number.parseInt(savedIndexRaw, 10)
		if (!Number.isNaN(savedIndex) && savedIndex >= 0) {
			setInitialTopMostItemIndex(savedIndex)
		}
	}, [scrollStateKey])

	// Track when user sends a message
	useEffect(() => {
		if (status === "submitted") {
			setHasSentMessage(true)
		}
	}, [status])

	useEffect(() => {
		return () => {
			if (animationResetTimerRef.current) {
				clearTimeout(animationResetTimerRef.current)
			}
		}
	}, [])

	// Auto-scroll when status changes to submitted
	useEffect(() => {
		if (status === "submitted" && autoScroll) {
			requestAnimationFrame(() => {
				virtuosoRef.current?.scrollToIndex({
					index: "LAST",
					behavior: "smooth",
				})
			})
		}
	}, [status, autoScroll])

	const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
		setIsAtBottom(atBottom)
	}, [])

	const scrollToBottom = useCallback(() => {
		if (virtuosoRef.current) {
			virtuosoRef.current.scrollToIndex({
				index: "LAST",
				behavior: "smooth",
			})
			return
		}

		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: "smooth",
			})
		}
	}, [])

	const handleAnimatedListScroll = useCallback(() => {
		const node = scrollContainerRef.current
		if (!node) {
			return
		}

		const distanceToBottom =
			node.scrollHeight - node.scrollTop - node.clientHeight
		setIsAtBottom(distanceToBottom <= 48)
	}, [])

	// Filter messages to get renderable ones (exclude empty assistant messages with errors)
	const renderableMessages = messages.filter((message, index) => {
		const isEmptyAssistantMessage =
			message.role === "assistant" &&
			(!message.parts ||
				message.parts.length === 0 ||
				message.parts.every(
					(p) =>
						p.type === "text" && (!p.text || p.text.trim() === ""),
				))

		// Skip empty assistant message at the end when there's an error
		if (
			chatError &&
			isEmptyAssistantMessage &&
			index === messages.length - 1
		) {
			return false
		}
		return true
	})

	useEffect(() => {
		const previousCount = previousRenderableCountRef.current
		const nextCount = renderableMessages.length

		if (nextCount === previousCount) {
			return
		}

		setListAnimationState(nextCount > previousCount ? "enter" : "exit")

		if (animationResetTimerRef.current) {
			clearTimeout(animationResetTimerRef.current)
		}

		animationResetTimerRef.current = setTimeout(() => {
			setListAnimationState("idle")
		}, 220)

		previousRenderableCountRef.current = nextCount
	}, [renderableMessages.length])

	// Render individual message item
	const itemContent = useCallback(
		(index: number, message: ChatMessage) => {
			const isLastMessage = index === renderableMessages.length - 1
			const isStreaming = status === "streaming" && isLastMessage

			return (
				<div className="px-2 pb-4 md:px-4 md:pb-6">
					<Message
						chatId={chatId}
						isLoading={isStreaming}
						isReadonly={isReadonly}
						message={message}
						regenerate={regenerate}
						requiresScrollPadding={hasSentMessage && isLastMessage}
						setMessages={setMessages}
						vote={
							!isGuest && votes
								? votes.find(
										(vote) => vote.messageId === message.id,
									)
								: undefined
						}
					/>
				</div>
			)
		},
		[
			chatId,
			isReadonly,
			regenerate,
			setMessages,
			votes,
			isGuest,
			status,
			hasSentMessage,
			renderableMessages.length,
		],
	)

	// Header component (spacer at top)
	const Header = useCallback(() => {
		return <div className="pt-4" />
	}, [])

	// Footer component (error state, thinking message, spacer)
	const Footer = useCallback(() => {
		return (
			<div className="px-2 md:px-4">
				{/* Error state with retry button - reserve space to prevent CLS */}
				<div className="min-h-[60px]">
					{chatError && status === "ready" && (
						<div className="pb-4 md:pb-6">
							<ErrorMessage
								clearError={clearError}
								error={chatError}
								regenerate={regenerate}
							/>
						</div>
					)}
				</div>

				{/* Thinking message during submission */}
				<AnimatePresence mode="wait">
					{status === "submitted" && (
						<div className="pb-4 md:pb-6">
							<ThinkingMessage key="thinking" />
						</div>
					)}
				</AnimatePresence>

				{/* Bottom spacer */}
				<div className="min-h-[24px] min-w-[24px] shrink-0" />
			</div>
		)
	}, [chatError, status, clearError, regenerate])

	// Show greeting if no messages
	if (messages.length === 0) {
		return (
			<div className="overscroll-behavior-contain touch-pan-y flex-1 overflow-y-auto">
				<div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
					<Greeting />
				</div>
			</div>
		)
	}

	const shouldUseAnimatedList = renderableMessages.length <= 40

	if (shouldUseAnimatedList) {
		return (
			<div
				className="overscroll-behavior-contain touch-pan-y relative flex-1 overflow-hidden"
				style={{ overflowAnchor: "none" }}
			>
				<div
					className="h-full overflow-y-auto"
					onScroll={handleAnimatedListScroll}
					ref={scrollContainerRef}
				>
					<div className="pt-4">
						<AnimatePresence initial={false}>
							{renderableMessages.map((message, index) => (
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									initial={{ opacity: 0, y: 10 }}
									key={
										message.id ?? `${message.role}-${index}`
									}
									transition={{
										duration: 0.2,
										ease: "easeOut",
									}}
								>
									{itemContent(index, message)}
								</motion.div>
							))}
						</AnimatePresence>
						<Footer />
					</div>
				</div>

				{/* Scroll to bottom button */}
				{!isAtBottom && (
					<button
						className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
						onClick={scrollToBottom}
						type="button"
					>
						<ArrowDownIcon className="size-4" />
					</button>
				)}
			</div>
		)
	}

	return (
		<div
			className="overscroll-behavior-contain touch-pan-y relative flex-1 overflow-hidden"
			style={{ overflowAnchor: "none" }}
		>
			<motion.div
				animate={
					listAnimationState === "enter"
						? { opacity: [0.985, 1], y: [6, 0] }
						: listAnimationState === "exit"
							? { opacity: [1, 0.985, 1], y: [0, -4, 0] }
							: { opacity: 1, y: 0 }
				}
				className="h-full"
				transition={{ duration: 0.22, ease: "easeOut" }}
			>
				<Virtuoso
					atBottomStateChange={handleAtBottomStateChange}
					atBottomThreshold={100}
					className="h-full"
					components={{
						Header,
						Footer,
					}}
					data={renderableMessages}
					followOutput="smooth"
					{...(initialTopMostItemIndex !== undefined
						? { initialTopMostItemIndex }
						: {})}
					increaseViewportBy={{ top: 200, bottom: 200 }}
					itemContent={itemContent}
					rangeChanged={({ startIndex }) => {
						if (typeof window !== "undefined") {
							window.sessionStorage.setItem(
								scrollStateKey,
								String(startIndex),
							)
						}
					}}
					ref={virtuosoRef}
					style={{ height: "100%" }}
				/>
			</motion.div>

			{/* Scroll to bottom button */}
			{!isAtBottom && (
				<button
					aria-label="Scroll to bottom"
					className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
					onClick={scrollToBottom}
					type="button"
				>
					<ArrowDownIcon className="size-4" />
				</button>
			)}
		</div>
	)
}

/**
 * Messages component with memoization for performance
 *
 * Skips re-renders when artifact panel is visible (messages are behind it).
 */
export const Messages = memo(PureMessages, (prevProps, nextProps) => {
	// INTENTIONAL: Skip re-renders when artifact panel is visible.
	// Messages are visually behind the artifact, so re-rendering is wasted work.
	// When artifact closes, isArtifactVisible changes triggering a re-render.
	if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
		return true
	}

	// During streaming, always re-render to capture text updates
	if (prevProps.status === "streaming" || nextProps.status === "streaming") {
		return false
	}

	// Status changed (covers non-streaming status transitions)
	if (prevProps.status !== nextProps.status) {
		return false
	}
	if (prevProps.selectedModelId !== nextProps.selectedModelId) {
		return false
	}
	// Fast path: check length before deep equality
	if (prevProps.messages.length !== nextProps.messages.length) {
		return false
	}
	if (!equal(prevProps.messages, nextProps.messages)) {
		return false
	}
	if (!equal(prevProps.votes, nextProps.votes)) {
		return false
	}
	// Check boolean props that affect rendering
	if (prevProps.isReadonly !== nextProps.isReadonly) {
		return false
	}
	if (prevProps.isGuest !== nextProps.isGuest) {
		return false
	}
	// Check error state changes
	if (prevProps.chatError !== nextProps.chatError) {
		return false
	}

	// All checks passed and not streaming - safe to skip render
	return true
})

Messages.displayName = "Messages"

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Error message component with retry button
 */
function ErrorMessage({
	error,
	regenerate,
	clearError,
}: {
	error: Error
	regenerate: UseChatHelpers<ChatMessage>["regenerate"]
	clearError: (() => void) | undefined
}) {
	const handleRetry = () => {
		clearError?.()
		regenerate()
	}

	// Extract error message, handling various error formats
	const errorMessage =
		error.message ||
		(error.cause ? String(error.cause) : "An unexpected error occurred")

	return (
		<div className="flex items-start gap-2 md:gap-3">
			<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
				<AlertCircle className="size-4 text-destructive" />
			</div>
			<div className="flex flex-col gap-2">
				<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm dark:bg-destructive/10">
					<p className="font-medium">Failed to get response</p>
					<p className="mt-1 text-destructive/80">{errorMessage}</p>
				</div>
				<button
					className="flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
					onClick={handleRetry}
					type="button"
				>
					<RotateCcw className="size-3.5" />
					Retry
				</button>
			</div>
		</div>
	)
}

/**
 * Greeting component for empty state
 */
function Greeting() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-8">
			<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
				<SparklesIcon size={24} />
			</div>
			<div className="text-center">
				<h1 className="text-xl font-semibold">
					How can I help you today?
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Start a conversation or try one of the suggestions below.
				</p>
			</div>
		</div>
	)
}

/**
 * Sparkles icon for greeting
 */
function SparklesIcon({ size = 16 }: { size?: number }) {
	return (
		<svg
			fill="none"
			height={size}
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			viewBox="0 0 24 24"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>AI</title>
			<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
		</svg>
	)
}
