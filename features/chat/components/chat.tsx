/**
 * Chat Component
 *
 * Main chat container component. Orchestrates the chat experience including
 * messages display, input handling, and streaming state management.
 *
 * @module features/chat/components
 */

"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AppUsage, Attachment, ChatMessage, UserVote } from "../types"
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

// =============================================================================
// Component
// =============================================================================

/**
 * Main chat container component
 *
 * Features:
 * - Message display with virtualization
 * - AI streaming with useChat hook
 * - Model selection
 * - Visibility controls
 * - Error handling with retry
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
	// Model selection state
	const [currentModelId, setCurrentModelId] = useState(initialChatModel)
	const currentModelIdRef = useRef(currentModelId)

	// Usage tracking (for future use with usage display)
	const [_usage, setUsage] = useState<AppUsage | undefined>(
		initialLastContext,
	)

	// Attachments for multimodal input (for Task 3.2c)
	const [_attachments, _setAttachments] = useState<Attachment[]>([])

	// Sync ref with state
	useEffect(() => {
		currentModelIdRef.current = currentModelId
	}, [currentModelId])

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

	// useChat hook for AI streaming
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
		generateId: () => crypto.randomUUID(),
		transport: new DefaultChatTransport({
			api: "/api/chat",
			prepareSendMessagesRequest(request) {
				return {
					body: {
						id: request.id,
						message: request.messages.at(-1),
						selectedChatModel: currentModelIdRef.current,
						selectedVisibilityType: initialVisibilityType,
						...request.body,
					},
				}
			},
		}),
		onData: (dataPart) => {
			// Handle usage data
			if (dataPart.type === "data-usage") {
				setUsage(dataPart.data as AppUsage)
			}
		},
	})

	// Handle model change
	const handleModelChange = useCallback((modelId: string) => {
		setCurrentModelId(modelId)
	}, [])

	// Input state (placeholder - actual input component will be in Task 3.2c)
	const [input, setInput] = useState("")

	return (
		<div className="flex h-dvh min-w-0 flex-col bg-background">
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
				isArtifactVisible={false}
				isGuest={false}
				isReadonly={isReadonly}
				messages={messages}
				regenerate={regenerate}
				selectedModelId={currentModelId}
				setMessages={setMessages}
				status={status}
				votes={initialVotes}
			/>

			{/* Input Area - placeholder for Task 3.2c */}
			{!isReadonly && (
				<div className="sticky bottom-0 z-1 mx-auto w-full max-w-4xl border-t bg-background px-2 pb-3 pt-2 md:px-4 md:pb-4">
					<div className="flex gap-2">
						<textarea
							className="min-h-[60px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
							disabled={
								status === "submitted" || status === "streaming"
							}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()
									if (input.trim()) {
										sendMessage({
											role: "user" as const,
											parts: [
												{ type: "text", text: input },
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
										parts: [{ type: "text", text: input }],
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
						{(status === "submitted" || status === "streaming") && (
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
	)
}

Chat.displayName = "Chat"
