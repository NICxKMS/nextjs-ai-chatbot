/**
 * Chat Component
 *
 * Main chat container component. Orchestrates the chat experience including
 * messages display, input handling, streaming state management, and settings integration.
 *
 * @module features/chat/components
 */

"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import {
	initialArtifactData,
	useArtifact,
	useArtifactSelector,
} from "@/features/artifact/hooks"
import { useAuth } from "@/features/auth"
import { useSettings } from "@/features/settings"
import { useOptimisticChats } from "@/features/sidebar/hooks"
import { useChatVisibility } from "@/hooks/use-chat-visibility"
import { motion } from "@/lib/motion"
import { fetchWithErrorHandlers } from "@/lib/utils"
import { useDataStream } from "../hooks/use-data-stream"
import type { AppUsage, Attachment, ChatMessage, UserVote } from "../types"
import { isDataAppendMessagePart, isDataChatTitlePart } from "../types"
import { Messages } from "./messages"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Chat component
 */
export interface ChatProps {
	/** Chat ID */
	id: string
	/** Initial messages to display */
	initialMessages: ChatMessage[]
	/** Initial AI model to use */
	initialChatModel: string
	/** Initial visibility setting */
	initialVisibilityType: "public" | "private"
	/** Whether chat is read-only */
	isReadonly: boolean
	/** Initial last context for state restoration */
	initialLastContext?: AppUsage
	/** Available AI models */
	availableModels?: ModelMetadata[]
	/** Initial votes on messages */
	initialVotes?: UserVote[]
}

/**
 * Model metadata for model selection
 */
export interface ModelMetadata {
	/** Model ID */
	id: string
	/** Display name */
	name: string
	/** Provider ID */
	providerId: string
	/** Provider name */
	providerName: string
}

/**
 * Visibility type for chats
 */
export type VisibilityType = "public" | "private"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a UUID v4.
 */
function generateUUID(): string {
	return crypto.randomUUID()
}

// =============================================================================
// Component
// =============================================================================

/**
 * Main chat container component
 *
 * Features:
 * - Message display with virtualization
 * - AI streaming with useChat hook
 * - Model selection with persistence
 * - Visibility controls
 * - Error handling with retry
 * - Artifact integration
 * - Data stream handling
 */
export function Chat({
	id,
	initialMessages,
	initialChatModel,
	initialVisibilityType,
	isReadonly,
	initialLastContext,
	availableModels = [],
	initialVotes,
}: ChatProps) {
	// =========================================================================
	// Hooks
	// =========================================================================

	// Visibility state management
	const { visibilityType } = useChatVisibility({
		chatId: id,
		initialVisibilityType,
	})

	// Data stream for artifact streaming
	const { setDataStream } = useDataStream()

	// Settings state (model, sampling, stream behavior)
	const { settings, setSelectedModelId } = useSettings()

	// Auth for session/guest detection
	const { clearNewSessionFlag, session } = useAuth()

	// Artifact state
	const { setArtifact } = useArtifact()
	const isArtifactVisible = useArtifactSelector((state) => state.isVisible)

	// Optimistic chats for immediate sidebar feedback
	const {
		addOptimisticChat,
		updateOptimisticChatTitle,
		removeOptimisticChat,
	} = useOptimisticChats()

	// =========================================================================
	// State
	// =========================================================================

	// Model selection state - prefer persisted model for new chats
	const [currentModelId, setCurrentModelId] = useState(initialChatModel)
	const currentModelIdRef = useRef(currentModelId)

	// Track if we've applied the persisted model (for new chats only)
	const hasAppliedPersistedModel = useRef(false)

	// Usage tracking (for future use with usage display)
	const [_usage, setUsage] = useState<AppUsage | undefined>(
		initialLastContext,
	)

	// Attachments for multimodal input (placeholder for Task 3.2c)
	const [_attachments] = useState<Attachment[]>([])

	// Input state
	const [input, setInput] = useState("")

	// Query parameter handling
	const searchParams = useSearchParams()
	const query = searchParams.get("query")
	const [hasAppendedQuery, setHasAppendedQuery] = useState(false)

	// Ref to track message count for onFinish callback
	const messagesLengthRef = useRef(0)

	// Ref to store timer IDs for cleanup
	const titlePollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

	// =========================================================================
	// Effects
	// =========================================================================

	// Sync persisted model selection from localStorage after hydration (new chats only)
	useEffect(() => {
		if (
			!hasAppliedPersistedModel.current &&
			initialMessages.length === 0 &&
			settings.selectedModelId &&
			settings.selectedModelId !== currentModelId
		) {
			hasAppliedPersistedModel.current = true
			setCurrentModelId(settings.selectedModelId)
		}
	}, [settings.selectedModelId, initialMessages.length, currentModelId])

	// Sync ref with state
	useEffect(() => {
		currentModelIdRef.current = currentModelId
	}, [currentModelId])

	// Cleanup title poll timers on unmount
	useEffect(() => {
		return () => {
			for (const timerId of titlePollTimersRef.current) {
				clearTimeout(timerId)
			}
			titlePollTimersRef.current = []
		}
	}, [])

	// Reset artifact visibility when navigating to a different chat
	// biome-ignore lint/correctness/useExhaustiveDependencies: Effect intentionally runs on id change only
	useEffect(() => {
		setArtifact({
			...initialArtifactData,
			boundingBox: {
				...initialArtifactData.boundingBox,
			},
		})
		// Cleanup data stream on unmount or chat change
		return () => {
			setDataStream([])
		}
	}, [id])

	// =========================================================================
	// Callbacks
	// =========================================================================

	// Handle model change with persistence
	const handleModelChange = useCallback(
		(modelId: string) => {
			setCurrentModelId(modelId)
			setSelectedModelId(modelId)
		},
		[setSelectedModelId],
	)

	// =========================================================================
	// Adaptive Throttle
	// =========================================================================

	// Adaptive throttle based on connection speed
	const optimalThrottle = useMemo(() => {
		if (typeof navigator !== "undefined" && "connection" in navigator) {
			const conn = (
				navigator as Navigator & {
					connection?: { effectiveType?: string }
				}
			).connection
			if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") {
				return 50 // Faster for good connections
			}
			if (conn?.effectiveType === "3g") {
				return 150 // Slower for 3G
			}
		}
		return 100 // Default
	}, [])

	// =========================================================================
	// useChat Hook
	// =========================================================================

	const {
		messages,
		setMessages,
		sendMessage,
		status,
		stop,
		regenerate,
		error: chatError,
		clearError,
	} = useChat<ChatMessage>({
		id,
		messages: initialMessages,
		experimental_throttle: optimalThrottle,
		generateId: generateUUID,
		transport: new DefaultChatTransport({
			api: "/api/chat",
			fetch: fetchWithErrorHandlers,
			prepareSendMessagesRequest(request) {
				return {
					body: {
						id: request.id,
						message: request.messages.at(-1),
						selectedChatModel: currentModelIdRef.current,
						selectedVisibilityType: visibilityType,
						settings,
						...request.body,
					},
				}
			},
		}),
		onData: (dataPart) => {
			// Handle artifact streaming
			if (settings.streamArtifacts) {
				setDataStream((ds) => (ds ? [...ds, dataPart] : []))
			}

			// Handle usage data
			if (dataPart.type === "data-usage") {
				setUsage(dataPart.data as AppUsage)
			}

			if (dataPart.type === "data-error") {
				toast.error(String(dataPart.data ?? "Chat request failed"))
			}

			// Handle chat title updates
			if (isDataChatTitlePart(dataPart)) {
				// Update the optimistic chat title in-place from the stream
				updateOptimisticChatTitle(id, dataPart.data)
				// Also dispatch event for sidebar to refresh
				window.dispatchEvent(new Event("chat-title-updated"))
			}

			// Handle appended messages
			if (isDataAppendMessagePart(dataPart)) {
				const data = dataPart.data
				if (typeof data === "string") {
					try {
						const message = JSON.parse(data)
						if (message?.id && message?.role) {
							setMessages((prev) => [...prev, message])
						}
					} catch {
						// Silently ignore parse errors
					}
				} else if (typeof data === "object" && data !== null) {
					const obj = data as Record<string, unknown>
					if (obj.id && obj.role) {
						setMessages((prev) => [
							...prev,
							data as unknown as ChatMessage,
						])
					}
				}
			}
		},
		onFinish: () => {
			// Poll for title updates for new chats
			if (
				initialMessages.length === 0 &&
				messagesLengthRef.current >= 1
			) {
				// Clear any existing timers before setting new ones
				for (const timerId of titlePollTimersRef.current) {
					clearTimeout(timerId)
				}
				titlePollTimersRef.current = []

				// New chat - poll for title updates with increasing delays
				const pollDelays = [500, 1500, 3000]
				for (const delay of pollDelays) {
					const timerId = setTimeout(() => {
						window.dispatchEvent(new Event("chat-title-updated"))
					}, delay)
					titlePollTimersRef.current.push(timerId)
				}
			}
		},
		onError: (error) => {
			// Remove optimistic chat on error
			removeOptimisticChat(id)
			toast.error(
				error instanceof Error
					? error.message
					: "Unexpected chat error. Please try again.",
			)
		},
	})

	useEffect(() => {
		const handleAuthLogout = () => {
			if (status === "submitted" || status === "streaming") {
				stop()
			}
		}

		window.addEventListener("auth:logout", handleAuthLogout)

		return () => {
			window.removeEventListener("auth:logout", handleAuthLogout)
		}
	}, [status, stop])

	// Keep messagesLengthRef in sync
	useEffect(() => {
		messagesLengthRef.current = messages.length
	}, [messages.length])

	// Add optimistic chat when user sends first message
	useEffect(() => {
		if (
			status === "submitted" &&
			initialMessages.length === 0 &&
			messages.length === 1
		) {
			// Extract initial title from first message for better UX
			const firstMessage = messages[0]
			const textPart = firstMessage?.parts?.find(
				(p): p is { type: "text"; text: string } => p.type === "text",
			)
			const initialTitle =
				textPart?.text?.slice(0, 80).trim() || "New Chat"

			addOptimisticChat(id, initialTitle)
			clearNewSessionFlag()
		}
	}, [
		status,
		messages,
		initialMessages.length,
		id,
		addOptimisticChat,
		clearNewSessionFlag,
	])

	// Handle query parameter for initial message
	// biome-ignore lint/correctness/useExhaustiveDependencies: sendMessage is stable from useChat
	useEffect(() => {
		if (query && !hasAppendedQuery) {
			sendMessage({
				role: "user" as const,
				parts: [{ type: "text", text: query }],
			})
			setHasAppendedQuery(true)
			window.history.replaceState({}, "", `/chat/${id}`)
		}
	}, [query, hasAppendedQuery, id])

	// =========================================================================
	// SWR for Votes
	// =========================================================================

	// Use server-provided votes (no client-side fetching for new messages)
	const { data: votes } = useSWR<UserVote[]>(
		`/api/votes?chatId=${id}`,
		null, // No fetcher - we never fetch votes client-side
		{
			fallbackData: initialVotes || [],
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			revalidateIfStale: false,
		},
	)

	// =========================================================================
	// Derived State
	// =========================================================================

	const isGuest = session?.user?.type === "guest"

	// =========================================================================
	// Render
	// =========================================================================

	return (
		<div className="overscroll-behavior-contain relative flex h-dvh min-w-0 touch-pan-y flex-col overflow-hidden bg-background">
			<motion.div
				animate={{
					opacity: [0.2, 0.4, 0.2],
					scale: [1, 1.015, 1],
				}}
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-background/0 to-background"
				transition={{
					duration: 14,
					ease: "easeInOut",
					repeat: Number.POSITIVE_INFINITY,
				}}
			/>

			<div className="relative z-10 flex h-full min-w-0 flex-col">
				{/* Chat Header - placeholder for Task 3.2c */}
				<div className="flex items-center justify-between border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<span className="font-medium">Chat</span>
						<span className="text-muted-foreground text-sm">
							({messages.length} messages)
						</span>
					</div>
					<div className="flex items-center gap-2">
						<select
							className="rounded border bg-background px-2 py-1 text-sm"
							onChange={(e) => handleModelChange(e.target.value)}
							value={currentModelId}
						>
							{availableModels.length > 0 ? (
								availableModels.map((model) => (
									<option key={model.id} value={model.id}>
										{model.name}
									</option>
								))
							) : (
								<option value={currentModelId}>
									{currentModelId}
								</option>
							)}
						</select>
					</div>
				</div>

				{/* Messages */}
				<Messages
					chatError={chatError}
					chatId={id}
					clearError={clearError}
					isArtifactVisible={isArtifactVisible}
					isGuest={isGuest}
					isReadonly={isReadonly}
					messages={messages}
					regenerate={regenerate}
					selectedModelId={currentModelId}
					setMessages={setMessages}
					status={status}
					votes={votes}
				/>

				{/* Input Area - placeholder for Task 3.2c */}
				{!isReadonly && (
					<div className="sticky bottom-0 z-1 mx-auto w-full max-w-4xl border-t bg-background px-2 pb-3 pt-2 md:px-4 md:pb-4">
						<div className="flex gap-2">
							<textarea
								className="min-h-[60px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
								disabled={
									status === "submitted" ||
									status === "streaming"
								}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault()
										if (input.trim()) {
											sendMessage({
												role: "user" as const,
												parts: [
													{
														type: "text",
														text: input,
													},
												],
											})
											setInput("")
										}
									}
								}}
								placeholder="Type a message..."
								value={input}
							/>
							<button
								className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
								disabled={
									status === "submitted" ||
									status === "streaming" ||
									!input.trim()
								}
								onClick={() => {
									if (input.trim()) {
										sendMessage({
											role: "user" as const,
											parts: [
												{ type: "text", text: input },
											],
										})
										setInput("")
									}
								}}
								type="button"
							>
								{status === "submitted" ||
								status === "streaming" ? (
									<span>Sending...</span>
								) : (
									<span>Send</span>
								)}
							</button>
							{(status === "submitted" ||
								status === "streaming") && (
								<button
									className="rounded-lg border px-4 py-2"
									onClick={() => stop()}
									type="button"
								>
									Stop
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

Chat.displayName = "Chat"
