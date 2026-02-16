/**
 * Message Component
 *
 * Single message component with support for different content types
 * (text, code, images) and interactive features.
 *
 * @module features/chat/components
 */

"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import equal from "fast-deep-equal"
import { memo, useState } from "react"
import { cn, sanitizeHtml } from "@/lib/utils"
import type { ChatMessage, UserVote } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Message component
 */
export interface MessageProps {
	/** Chat ID for context */
	chatId: string
	/** Message data */
	message: ChatMessage
	/** User's vote on this message */
	vote: UserVote | undefined
	/** Whether message is being streamed */
	isLoading?: boolean
	/** Set messages function from useChat */
	setMessages: UseChatHelpers<ChatMessage>["setMessages"]
	/** Regenerate function from useChat */
	regenerate: UseChatHelpers<ChatMessage>["regenerate"]
	/** Whether in read-only mode */
	isReadonly?: boolean
	/** Whether message needs scroll padding */
	requiresScrollPadding?: boolean
}

/**
 * Props for the ThinkingMessage component
 */
export interface ThinkingMessageProps {
	/** Optional className for styling */
	className?: string
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Type for file parts from message - may have name or filename depending on source
 */
type FilePart = {
	type: "file"
	url: string
	mediaType: string
	name?: string
	filename?: string
}

// =============================================================================
// Components
// =============================================================================

/**
 * Pure preview message component (internal implementation)
 *
 * Renders a single message with:
 * - Role-based styling (user vs assistant)
 * - File attachments
 * - Text content with markdown
 * - Tool invocations
 * - Message actions
 */
const PurePreviewMessage = ({
	chatId: _chatId,
	message,
	vote: _vote,
	isLoading: _isLoading,
	setMessages: _setMessages,
	regenerate,
	isReadonly,
	requiresScrollPadding,
}: MessageProps) => {
	const [mode, setMode] = useState<"view" | "edit">("view")

	const attachmentsFromMessage = message.parts?.filter(
		(part): part is FilePart => part.type === "file",
	)

	return (
		<div
			className="group/message w-full animate-in fade-in-0"
			data-role={message.role}
			data-testid={`message-${message.role}`}
		>
			<div
				className={cn("flex w-full items-start gap-2 md:gap-3", {
					"justify-end": message.role === "user" && mode !== "edit",
					"justify-start": message.role === "assistant",
				})}
			>
				{message.role === "assistant" && (
					<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
						<SparklesIcon size={14} />
					</div>
				)}

				<div
					className={cn("flex flex-col", {
						"gap-2 md:gap-4": message.parts?.some(
							(p) => p.type === "text" && p.text?.trim(),
						),
						"min-h-96":
							message.role === "assistant" &&
							requiresScrollPadding,
						"w-full":
							(message.role === "assistant" &&
								message.parts?.some(
									(p) => p.type === "text" && p.text?.trim(),
								)) ||
							mode === "edit",
						"max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
							message.role === "user" && mode !== "edit",
					})}
				>
					{attachmentsFromMessage &&
						attachmentsFromMessage.length > 0 && (
							<div
								className="flex flex-row justify-end gap-2"
								data-testid="message-attachments"
							>
								{attachmentsFromMessage.map((attachment) => (
									<div
										key={attachment.url}
										className="rounded-lg border bg-muted p-2 text-sm"
									>
										📄{" "}
										{attachment.name ??
											attachment.filename ??
											"file"}
									</div>
								))}
							</div>
						)}

					{message.parts?.map((part, index) => {
						const { type } = part
						const key = `message-${message.id}-part-${index}`

						if (
							type === "reasoning" &&
							part.text?.trim().length > 0
						) {
							return (
								<div
									key={key}
									className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-sm"
								>
									<div className="mb-1 font-medium">
										Reasoning
									</div>
									<div className="whitespace-pre-wrap">
										{part.text}
									</div>
								</div>
							)
						}

						if (type === "text") {
							if (mode === "view") {
								return (
									<div key={key}>
										<div
											className={cn("message-content", {
												"w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
													message.role === "user",
												"bg-transparent px-0 py-0 text-left":
													message.role ===
													"assistant",
											})}
											data-testid="message-content"
											style={
												message.role === "user"
													? {
															backgroundColor:
																"#006cff",
														}
													: undefined
											}
										>
											<div className="whitespace-pre-wrap">
												{sanitizeHtml(part.text)}
											</div>
										</div>
									</div>
								)
							}

							if (mode === "edit") {
								return (
									<div
										className="flex w-full flex-row items-start gap-3"
										key={key}
									>
										<div className="size-8" />
										<div className="min-w-0 flex-1">
											{/* TODO: Integrate MessageEditor component from Task 3.2b */}
											<div className="rounded-lg border p-3">
												<textarea
													className="w-full resize-none border-none bg-transparent outline-none"
													defaultValue={part.text}
													rows={3}
												/>
												<div className="mt-2 flex gap-2">
													<button
														className="rounded bg-primary px-3 py-1 text-primary-foreground text-sm"
														onClick={() =>
															setMode("view")
														}
														type="button"
													>
														Save
													</button>
													<button
														className="rounded border px-3 py-1 text-sm"
														onClick={() =>
															setMode("view")
														}
														type="button"
													>
														Cancel
													</button>
												</div>
											</div>
										</div>
									</div>
								)
							}
						}

						// Tool invocations - placeholder for now
						if (type.startsWith("tool-")) {
							return (
								<div
									key={key}
									className="rounded-lg border bg-muted/50 p-3 text-sm"
								>
									<div className="font-medium">
										Tool: {type}
									</div>
									<div className="mt-1 text-muted-foreground">
										Tool result placeholder
									</div>
								</div>
							)
						}

						return null
					})}

					{!isReadonly && (
						<div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover/message:opacity-100">
							<button
								className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
								onClick={() => setMode("edit")}
								type="button"
							>
								✏️ Edit
							</button>
							<button
								className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
								type="button"
							>
								📋 Copy
							</button>
							{message.role === "assistant" && (
								<button
									className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
									onClick={() => regenerate()}
									type="button"
								>
									🔄 Regenerate
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

/**
 * Message component with memoization for performance
 *
 * Only re-renders when relevant props change.
 */
export const Message = memo(PurePreviewMessage, (prevProps, nextProps) => {
	// During loading/streaming, always re-render to capture text updates
	if (prevProps.isLoading || nextProps.isLoading) {
		return false
	}
	if (prevProps.message.id !== nextProps.message.id) {
		return false
	}
	if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
		return false
	}
	if (!equal(prevProps.message.parts, nextProps.message.parts)) {
		return false
	}
	if (!equal(prevProps.vote, nextProps.vote)) {
		return false
	}

	// All checks passed and not loading - safe to skip render
	return true
})

Message.displayName = "Message"

/**
 * ThinkingMessage component
 *
 * Loading state indicator shown while AI is processing.
 */
export const ThinkingMessage = ({ className }: ThinkingMessageProps) => {
	const role = "assistant"

	return (
		<div
			className={cn(
				"group/message w-full animate-in fade-in-0",
				className,
			)}
			data-role={role}
			data-testid="message-assistant-loading"
		>
			<div className="flex items-start justify-start gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
					<SparklesIcon size={14} />
				</div>

				<div className="flex w-full flex-col gap-2 md:gap-4">
					<div className="p-0 text-muted-foreground text-sm">
						Thinking...
					</div>
				</div>
			</div>
		</div>
	)
}

ThinkingMessage.displayName = "ThinkingMessage"

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Sparkles icon for assistant messages
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
