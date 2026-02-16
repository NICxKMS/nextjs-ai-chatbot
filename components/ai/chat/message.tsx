/**
 * AI Message Wrapper Component
 *
 * Project wrapper for ai-elements Message primitive that adds:
 * - Role-based styling and layout
 * - Message actions integration (copy, edit, vote)
 * - Attachment display support
 * - Streaming state handling
 *
 * @module components/ai/chat/message
 */

"use client"

import type { UIMessage } from "ai"
import { memo } from "react"
import {
	Message as AIMessageBase,
	MessageContent as AIMessageContentBase,
	type MessageContentProps as AIMessageContentProps,
	type MessageProps as AIMessageProps,
} from "@/components/ai-elements/message"
import { SparklesIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Vote type for message voting
 */
export interface MessageVote {
	isUpvoted?: boolean
	isDownvoted?: boolean
}

/**
 * Props for the AIMessage wrapper component
 */
export interface AIMessageWrapperProps extends Omit<AIMessageProps, "from"> {
	/** The chat message data */
	message: UIMessage
	/** User's vote on this message (if any) */
	vote?: MessageVote
	/** Whether the chat is currently loading/streaming */
	isLoading: boolean
	/** Chat ID for actions */
	chatId: string
	/** Whether the message is in readonly mode */
	isReadonly?: boolean
	/** Whether this message requires scroll padding */
	requiresScrollPadding?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Internal message component with memoization for performance
 */
const AIMessageComponent = ({
	message,
	vote: _vote,
	isLoading: _isLoading,
	chatId: _chatId,
	isReadonly = false,
	requiresScrollPadding = false,
	className,
}: AIMessageWrapperProps) => {
	return (
		<AIMessageBase
			className={cn(
				"group/message relative",
				message.role === "user" && "justify-end",
				className,
			)}
			from={message.role}
			data-testid={`message-${message.role}`}
		>
			<div className="flex w-full items-start gap-2 md:gap-3">
				{message.role === "assistant" && (
					<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
						<SparklesIcon size={14} />
					</div>
				)}

				<div
					className={cn("flex flex-col", {
						"gap-2 md:gap-4": message.parts?.some(
							(p: UIMessage["parts"][number]) =>
								p.type === "text" &&
								("text" in p ? p.text?.trim() : false),
						),
						"min-h-96":
							message.role === "assistant" &&
							requiresScrollPadding,
						"w-full":
							message.role === "assistant" &&
							message.parts?.some(
								(p: UIMessage["parts"][number]) =>
									p.type === "text" &&
									("text" in p ? p.text?.trim() : false),
							),
						"max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
							message.role === "user",
					})}
				>
					{message.parts?.map(
						(part: UIMessage["parts"][number], index: number) => {
							if (part.type === "text" && "text" in part) {
								return (
									<AIMessageContentBase
										key={`message-${message.id}-part-${index}`}
										className={cn({
											"w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
												message.role === "user",
											"bg-transparent px-0 py-0 text-left":
												message.role === "assistant",
										})}
										data-testid="message-content"
										style={
											message.role === "user"
												? { backgroundColor: "#006cff" }
												: undefined
										}
									>
										{part.text}
									</AIMessageContentBase>
								)
							}
							return null
						},
					)}

					{!isReadonly && (
						<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100">
							{/* Message actions will be rendered here */}
						</div>
					)}
				</div>
			</div>
		</AIMessageBase>
	)
}

/**
 * Memoized AI Message wrapper component
 *
 * Uses JSON comparison for message parts and vote state
 * to prevent unnecessary re-renders during streaming.
 */
export const AIMessage = memo(AIMessageComponent, (prevProps, nextProps) => {
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
	// Deep compare message parts
	if (
		JSON.stringify(prevProps.message.parts) !==
		JSON.stringify(nextProps.message.parts)
	) {
		return false
	}
	if (JSON.stringify(prevProps.vote) !== JSON.stringify(nextProps.vote)) {
		return false
	}

	return true
})

/**
 * Thinking message component for loading state
 */
export const AIThinkingMessage = () => {
	return (
		<AIMessageBase
			className="group/message w-full"
			from="assistant"
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
		</AIMessageBase>
	)
}

export type { AIMessageProps, AIMessageContentProps }
