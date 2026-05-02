"use client"

import type { UIMessage } from "ai"
import { ArrowDownIcon } from "lucide-react"
import { memo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { useScrollToBottom } from "@/features/chat/hooks/use-scroll-to-bottom"

import { Greeting } from "./greeting"
import { ChatMessage, ThinkingMessage } from "./message"
import { MessageActions } from "./message-actions"
import { MessageEditor } from "./message-editor"
import { SuggestedActions } from "./suggested-actions"

// ── Per-message wrapper ──────────────────────────────────────
// Manages view/edit mode for each message. In view mode, renders
// ChatMessage + MessageActions. In edit mode, renders MessageEditor.

interface MessageItemProps {
	message: UIMessage
	isLoading: boolean
	isReadonly: boolean
}

function PureMessageItem({ message, isLoading, isReadonly }: MessageItemProps) {
	const [mode, setMode] = useState<"view" | "edit">("view")

	if (mode === "edit") {
		return (
			<div className="group/message w-full px-2 md:px-4">
				<MessageEditor message={message} setMode={setMode} />
			</div>
		)
	}

	return (
		<div className="group/message w-full px-2 md:px-4">
			<ChatMessage isLoading={isLoading} message={message} />

			{!isLoading && (
				<MessageActions
					message={message}
					setMode={message.role === "user" && !isReadonly ? setMode : undefined}
				/>
			)}
		</div>
	)
}

/** Shallow parts comparison: length + last-element identity check. */
function arePartsEqual(prev: UIMessage["parts"], next: UIMessage["parts"]): boolean {
	if (prev.length !== next.length) return false
	if (prev.length === 0) return true
	return prev[prev.length - 1] === next[next.length - 1]
}

const MessageItem = memo(PureMessageItem, (prev, next) => {
	if (prev.isLoading || next.isLoading) return false
	if (prev.isReadonly !== next.isReadonly) return false
	if (prev.message.id !== next.message.id) return false
	if (!arePartsEqual(prev.message.parts, next.message.parts)) return false
	return true
})

MessageItem.displayName = "MessageItem"

// ── Messages list ────────────────────────────────────────────

function PureMessages() {
	const { messages, status, isReadonly } = useChatSessionContext()
	const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom()

	// ── Empty state ──────────────────────────────────────────
	if (messages.length === 0) {
		return (
			<div
				className="flex flex-1 flex-col overflow-y-auto"
				data-testid="messages-empty"
				ref={containerRef}
			>
				<div className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col justify-center gap-6 px-4 py-4">
					<Greeting />
					<SuggestedActions />
				</div>
				<div ref={endRef} />
			</div>
		)
	}

	// ── Message list ─────────────────────────────────────────
	return (
		<section aria-label="Chat messages" className="relative flex-1 overflow-hidden">
			<div
				aria-live="polite"
				className="h-full overflow-y-auto"
				data-testid="messages-list"
				ref={containerRef}
			>
				<div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 py-4 md:gap-6">
					{messages.map((message, index) => (
						<MessageItem
							isLoading={status === "streaming" && index === messages.length - 1}
							isReadonly={isReadonly}
							key={message.id}
							message={message}
						/>
					))}

					{status === "submitted" && (
						<div className="px-2 md:px-4">
							<ThinkingMessage />
						</div>
					)}

					{/* Spacer for scroll padding */}
					<div className="min-h-6 shrink-0" />
				</div>

				{/* Sentinel element for IntersectionObserver scroll detection */}
				<div ref={endRef} />
			</div>

			{/* Scroll-to-bottom FAB */}
			{!isAtBottom && (
				<Button
					aria-label="Scroll to bottom"
					className="-translate-x-1/2 absolute bottom-4 left-1/2 z-10 rounded-full shadow-lg after:absolute after:-inset-0.5 after:md:hidden"
					data-testid="scroll-to-bottom"
					onClick={scrollToBottom}
					size="icon"
					type="button"
					variant="outline"
				>
					<ArrowDownIcon className="size-4" />
				</Button>
			)}
		</section>
	)
}

/**
 * Messages — scrollable chat message list.
 *
 * Reads messages/status/isReadonly from ChatSessionContext.
 * Maps each UIMessage → ChatMessage + MessageActions.
 * Shows Greeting + SuggestedActions when empty.
 * Uses useScrollToBottom (IntersectionObserver) for scroll detection
 * and shows a scroll-to-bottom FAB when user scrolls up.
 * Shows ThinkingMessage during the "submitted" phase.
 */
export const Messages = memo(PureMessages)

Messages.displayName = "Messages"
