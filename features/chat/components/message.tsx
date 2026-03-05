"use client"

import type { ToolUIPart, UIMessage } from "ai"
import equal from "fast-deep-equal"
import { memo } from "react"

import { Attachment, AttachmentPreview } from "@/components/ai-elements/attachments"
import { MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool"
import { SparklesIcon } from "@/components/icons"
import { ArtifactPreview } from "@/features/artifacts/components/artifact-preview"
import { cn } from "@/lib/utils/cn"

import { MessageReasoning } from "./message-reasoning"

// ── Types ────────────────────────────────────────────────────

type FilePart = {
	type: "file"
	url: string
	mediaType: string
	name?: string
	filename?: string
}

interface ChatMessageProps {
	/** The message to render */
	message: UIMessage
	/** Whether the chat is currently loading/streaming */
	isLoading: boolean
}

// ── Helpers ──────────────────────────────────────────────────

/** Strip known junk tokens injected by some providers */
function sanitizeText(text: string): string {
	return text.replace("<has_function_call>", "")
}

/** Human-readable tool name from type (e.g. "tool-getWeather" → "getWeather") */
function formatToolName(type: string): string {
	return type.startsWith("tool-") ? type.slice(5) : type
}

// ── Artifact tool error ──────────────────────────────────────
// Inline error card for failed createArtifact / updateArtifact calls.
// Non-error artifact tools are rendered via ArtifactPreview.

function ArtifactToolError({ errorMessage }: { errorMessage: string }) {
	return (
		<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
			Error: {errorMessage}
		</div>
	)
}

// ── Generic tool result ──────────────────────────────────────
// Renders tool invocations that don't have dedicated UI components.
// Shows parameters when running and formatted output when complete.

function GenericToolResult({ part }: { part: ToolPartLike }) {
	const { toolCallId, state, type } = part
	const toolName = formatToolName(type)

	return (
		<Tool defaultOpen key={toolCallId}>
			<ToolHeader
				state={state as ToolUIPart["state"]}
				title={toolName}
				type={type as `tool-${string}`}
			/>
			<ToolContent>
				{(state === "input-available" || state === "input-streaming") &&
					part.input !== undefined && <ToolInput input={part.input} />}
				{state === "output-available" && (
					<ToolOutput errorText={undefined} output={part.output} />
				)}
				{state === "output-error" && (
					<ToolOutput errorText={part.errorText} output={undefined} />
				)}
			</ToolContent>
		</Tool>
	)
}

// Loose tool part shape — actual type from AI SDK is generic,
// so we use a structural type for part matching.
interface ToolPartLike {
	type: string
	toolCallId: string
	state: string
	input?: unknown
	output?: unknown
	errorText?: string
}

function isToolPart(part: { type: string }): part is ToolPartLike {
	return part.type.startsWith("tool-")
}

// ── Main component ───────────────────────────────────────────

const PureChatMessage = ({ message, isLoading }: ChatMessageProps) => {
	const { role, parts } = message

	// Extract file attachments from message parts
	const attachments = (parts ?? []).filter((part): part is FilePart => part.type === "file")

	return (
		<div className="group/message w-full" data-role={role} data-testid={`message-${role}`}>
			<div
				className={cn("flex w-full items-start gap-2 md:gap-3", {
					"justify-end": role === "user",
					"justify-start": role === "assistant",
				})}
			>
				{/* Assistant avatar */}
				{role === "assistant" && (
					<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
						<SparklesIcon size={14} />
					</div>
				)}

				<div
					className={cn("flex flex-col", {
						"gap-2 md:gap-4": (parts ?? []).some(
							(p) => p.type === "text" && "text" in p && (p.text as string)?.trim(),
						),
						"w-full":
							role === "assistant" &&
							(parts ?? []).some(
								(p) =>
									p.type === "text" && "text" in p && (p.text as string)?.trim(),
							),
						"max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
							role === "user",
					})}
				>
					{/* User attachments */}
					{attachments.length > 0 && (
						<div
							className="flex flex-row justify-end gap-2"
							data-testid="message-attachments"
						>
							{attachments.map((attachment) => (
								<Attachment
									data={{
										type: "file",
										url: attachment.url,
										mediaType: attachment.mediaType,
										filename: attachment.name ?? attachment.filename ?? "file",
										id: attachment.url,
									}}
									key={attachment.url}
								>
									<AttachmentPreview />
								</Attachment>
							))}
						</div>
					)}

					{/* Render message parts */}
					{(parts ?? []).map((part, index) => {
						const key = `message-${message.id}-part-${index}`

						// ── Reasoning parts ──────────────────────
						if (
							part.type === "reasoning" &&
							"text" in part &&
							typeof part.text === "string" &&
							part.text.trim().length > 0
						) {
							return (
								<MessageReasoning
									isLoading={isLoading}
									key={key}
									reasoning={part.text}
								/>
							)
						}

						// ── Text parts ───────────────────────────
						if (part.type === "text" && "text" in part) {
							const text = part.text as string

							if (role === "user") {
								return (
									<div key={key}>
										<MessageContent
											className="w-fit break-words rounded-2xl px-3 py-2 text-right text-white"
											data-testid="message-content"
											style={{ backgroundColor: "#006cff" }}
										>
											<MessageResponse>{sanitizeText(text)}</MessageResponse>
										</MessageContent>
									</div>
								)
							}

							// Assistant text
							return (
								<div key={key}>
									<MessageContent
										className="bg-transparent px-0 py-0 text-left"
										data-testid="message-content"
									>
										<MessageResponse>{sanitizeText(text)}</MessageResponse>
									</MessageContent>
								</div>
							)
						}

						// ── Tool invocations ─────────────────────
						if (isToolPart(part)) {
							const toolName = formatToolName(part.type)

							// Artifact tools — rich inline preview via ArtifactPreview
							if (toolName === "createArtifact" || toolName === "updateArtifact") {
								// Error state — show inline error card
								if (
									part.state === "output-error" ||
									(part.output &&
										typeof part.output === "object" &&
										"error" in part.output)
								) {
									const errorMessage =
										part.errorText ??
										(part.output &&
										typeof part.output === "object" &&
										"error" in part.output
											? String((part.output as Record<string, unknown>).error)
											: "Unknown error")
									return (
										<ArtifactToolError
											errorMessage={errorMessage}
											key={part.toolCallId}
										/>
									)
								}

								return (
									<ArtifactPreview
										args={
											part.input as
												| {
														title?: string
														kind?: string
														id?: string
												  }
												| undefined
										}
										key={part.toolCallId}
										result={
											part.output as
												| {
														id?: string
														title?: string
														kind?: string
														content?: string
												  }
												| undefined
										}
									/>
								)
							}

							// All other tools — generic rendering
							return <GenericToolResult key={part.toolCallId} part={part} />
						}

						return null
					})}
				</div>
			</div>
		</div>
	)
}

/**
 * ChatMessage — renders a single user or assistant message.
 *
 * For assistant messages: iterates over `parts` array and renders
 * text (Markdown via Streamdown), tool invocations (collapsible
 * result UI), and reasoning (collapsible chain-of-thought).
 *
 * For user messages: renders content with Markdown and attachment previews.
 *
 * Memoized to prevent unnecessary re-renders during streaming.
 */
export const ChatMessage = memo(PureChatMessage, (prevProps, nextProps) => {
	// During loading/streaming, always re-render to capture text updates
	if (prevProps.isLoading || nextProps.isLoading) {
		return false
	}
	if (prevProps.message.id !== nextProps.message.id) {
		return false
	}
	if (!equal(prevProps.message.parts, nextProps.message.parts)) {
		return false
	}
	return true
})

ChatMessage.displayName = "ChatMessage"

// ── Thinking indicator ───────────────────────────────────────

/**
 * Shown while waiting for the assistant to begin responding.
 */
export function ThinkingMessage() {
	return (
		<div
			className="group/message w-full"
			data-role="assistant"
			data-testid="message-assistant-loading"
		>
			<div className="flex items-start justify-start gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
					<SparklesIcon size={14} />
				</div>
				<div className="flex w-full flex-col gap-2 md:gap-4">
					<div className="p-0 text-muted-foreground text-sm">Thinking...</div>
				</div>
			</div>
		</div>
	)
}
