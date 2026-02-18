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
import { Streamdown } from "streamdown"
import { AIToolCall } from "@/components/ai/tools/call"
import type { WeatherProps } from "@/components/ai/tools/weather"
import { Weather } from "@/components/ai/tools/weather"
import {
	DocumentToolCall,
	type DocumentToolCallProps,
	DocumentToolResult,
	type DocumentToolResultProps,
} from "@/components/document/document"
import { motion } from "@/lib/motion"
import { cn, sanitizeText } from "@/lib/utils"
import type { ChatMessage, UserVote } from "../types"
import { MessageActions } from "./message-actions"
import { MessageEditor } from "./message-editor"
import { MessageReasoning } from "./message-reasoning"

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
 * Preview Attachment Component
 *
 * Displays file attachments with image preview support.
 */
function PreviewAttachment({
	attachment,
}: {
	attachment: {
		name?: string
		filename?: string
		contentType?: string
		url: string
	}
}) {
	const { name, url, contentType } = attachment
	const isImage = contentType?.startsWith("image/")

	return (
		<div
			className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
			data-testid="message-attachment-preview"
		>
			{isImage ? (
				// biome-ignore lint/performance/noImgElement: attachment preview with dynamic URL
				<img
					alt={name ?? "An image attachment"}
					className="size-full object-cover"
					height={64}
					src={url}
					width={64}
				/>
			) : (
				<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
					File
				</div>
			)}
			<div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
				{name ?? "file"}
			</div>
		</div>
	)
}

/**
 * MessageContent Component
 *
 * Wrapper for message content with role-based styling.
 */
function MessageContent({
	children,
	className,
	style,
	"data-testid": testId,
}: {
	children: React.ReactNode
	className?: string
	"data-testid"?: string | undefined
	style?: React.CSSProperties | undefined
}) {
	return (
		<div
			className={cn("message-content", className)}
			data-testid={testId}
			style={style}
		>
			{children}
		</div>
	)
}

/**
 * Response Component
 *
 * Renders message text content with markdown formatting.
 * Uses Streamdown for streaming-compatible markdown rendering.
 */
function Response({ children }: { children: string }) {
	return <Streamdown>{children}</Streamdown>
}

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
	chatId,
	message,
	vote,
	isLoading,
	setMessages,
	regenerate,
	isReadonly,
	requiresScrollPadding,
}: MessageProps) => {
	const [mode, setMode] = useState<"view" | "edit">("view")

	const attachmentsFromMessage = message.parts?.filter(
		(part): part is FilePart => part.type === "file",
	)

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className="group/message w-full"
			data-role={message.role}
			data-testid={`message-${message.role}`}
			initial={{ opacity: 0 }}
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
									<PreviewAttachment
										attachment={{
											name:
												attachment.name ??
												attachment.filename ??
												"file",
											contentType: attachment.mediaType,
											url: attachment.url,
										}}
										key={attachment.url}
									/>
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
								<MessageReasoning
									isLoading={isLoading ?? false}
									key={key}
									reasoning={part.text}
								/>
							)
						}

						if (type === "text") {
							if (mode === "view") {
								return (
									<div key={key}>
										<MessageContent
											className={cn({
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
											<Response>
												{sanitizeText(part.text)}
											</Response>
										</MessageContent>
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
											<MessageEditor
												chatId={chatId}
												key={message.id}
												message={message}
												regenerate={regenerate}
												setMessages={setMessages}
												setMode={setMode}
											/>
										</div>
									</div>
								)
							}
						}

						// Tool invocations - AI SDK uses tool-${toolName} format for type
						if (type.startsWith("tool-")) {
							// Extract tool name from type (e.g., "tool-getWeather" -> "getWeather")
							const toolName = type.replace(/^tool-/, "")
							const toolPart = part as {
								toolCallId: string
								state: string
								input?: Record<string, unknown>
								output?: unknown
								errorText?: string
							}

							// Handle tool call (input-available state)
							if (
								toolPart.state === "input-available" ||
								toolPart.state === "input-streaming"
							) {
								// Handle document tools
								if (
									toolName === "createDocument" ||
									toolName === "updateDocument" ||
									toolName === "requestSuggestions"
								) {
									return (
										<DocumentToolCall
											args={
												(toolPart.input ||
													{}) as DocumentToolCallProps["args"]
											}
											isReadonly={isReadonly ?? false}
											key={key}
											type={
												toolName === "createDocument"
													? "create"
													: toolName ===
															"updateDocument"
														? "update"
														: "request-suggestions"
											}
										/>
									)
								}

								// Generic tool call display
								return (
									<AIToolCall
										defaultOpen={false}
										input={toolPart.input}
										key={key}
										toolCallId={toolPart.toolCallId}
										toolType={type}
										state="input-available"
									/>
								)
							}

							// Handle tool result (output-available or output-error state)
							if (
								toolPart.state === "output-available" ||
								toolPart.state === "output-error"
							) {
								// Handle weather tool result
								if (toolName === "getWeather") {
									const weatherData = toolPart.output as
										| {
												weatherAtLocation?: WeatherProps["weatherAtLocation"]
										  }
										| undefined
									if (weatherData?.weatherAtLocation) {
										return (
											<div
												key={key}
												className="my-2 max-w-md"
											>
												<Weather
													weatherAtLocation={
														weatherData.weatherAtLocation
													}
												/>
											</div>
										)
									}
								}

								// Handle document tool result
								if (
									toolName === "createDocument" ||
									toolName === "updateDocument" ||
									toolName === "requestSuggestions"
								) {
									const docResult = toolPart.output as
										| {
												id: string
												title: string
												kind: string
										  }
										| undefined

									// Check for error in output
									if (
										toolPart.output &&
										typeof toolPart.output === "object" &&
										"error" in toolPart.output
									) {
										return (
											<div
												className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
												key={key}
											>
												Error{" "}
												{toolName === "createDocument"
													? "creating"
													: "updating"}{" "}
												document:{" "}
												{String(
													(
														toolPart.output as {
															error: string
														}
													).error,
												)}
											</div>
										)
									}

									if (docResult) {
										return (
											<DocumentToolResult
												isReadonly={isReadonly ?? false}
												key={key}
												result={{
													id: docResult.id,
													title: docResult.title,
													kind: docResult.kind as DocumentToolResultProps["result"]["kind"],
												}}
												type={
													toolName ===
													"createDocument"
														? "create"
														: toolName ===
																"updateDocument"
															? "update"
															: "request-suggestions"
												}
											/>
										)
									}
								}

								// Generic tool result display
								const isError =
									toolPart.state === "output-error"
								const errorText = isError
									? toolPart.errorText
									: undefined
								return (
									<AIToolCall
										defaultOpen={false}
										{...(errorText ? { errorText } : {})}
										key={key}
										output={toolPart.output}
										toolCallId={toolPart.toolCallId}
										toolType={type}
										state={
											isError
												? "output-error"
												: "output-available"
										}
									/>
								)
							}
						}

						return null
					})}

					{!isReadonly && (
						<MessageActions
							chatId={chatId}
							isLoading={isLoading ?? false}
							key={`action-${message.id}`}
							message={message}
							setMode={setMode}
							vote={vote}
						/>
					)}
				</div>
			</div>
		</motion.div>
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
		<motion.div
			animate={{ opacity: 1 }}
			className={cn("group/message w-full", className)}
			data-role={role}
			data-testid="message-assistant-loading"
			exit={{ opacity: 0, transition: { duration: 0.5 } }}
			initial={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
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
		</motion.div>
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
