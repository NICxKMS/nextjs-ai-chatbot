"use client"

import type { UIMessage } from "ai"
import equal from "fast-deep-equal"
import { memo, useMemo } from "react"
import { toast } from "sonner"

import {
	MessageAction,
	MessageActions as MessageActionsContainer,
} from "@/components/ai-elements/message"
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "@/components/icons"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import type { Vote } from "@/lib/types/models.types"

// ── Types ────────────────────────────────────────────────────

interface MessageActionsToolbarProps {
	/** The message this toolbar belongs to */
	message: UIMessage
	/** Switch message into edit mode (only provided for user messages when not readonly) */
	setMode?: (mode: "view" | "edit") => void
	/** Current vote state for this message (provided by VoteResolver in P6) */
	vote?: Vote
}

// ── Helpers ──────────────────────────────────────────────────

/** Extract concatenated text from a UIMessage's text parts */
function getMessageText(message: UIMessage): string {
	return (message.parts ?? [])
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim()
}

// ── Component ────────────────────────────────────────────────

function PureMessageActions({ message, setMode, vote }: MessageActionsToolbarProps) {
	const { isReadonly, status } = useChatSessionContext()

	const isLoading = status === "streaming" || status === "submitted"

	const textContent = useMemo(() => getMessageText(message), [message])

	// Don't show actions while streaming / loading
	if (isLoading) return null

	const handleCopy = async () => {
		if (!textContent) {
			toast.error("There's no text to copy!")
			return
		}
		try {
			await navigator.clipboard.writeText(textContent)
			toast.success("Copied to clipboard!")
		} catch {
			toast.error("Failed to copy to clipboard")
		}
	}

	// ── User message actions: Edit (hover) + Copy ────────────
	if (message.role === "user") {
		return (
			<MessageActionsContainer className="-mr-0.5 justify-end">
				<div className="relative">
					{!isReadonly && setMode && (
						<MessageAction
							className="absolute -left-10 top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => setMode("edit")}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</MessageAction>
					)}
					<MessageAction onClick={handleCopy} tooltip="Copy">
						<CopyIcon />
					</MessageAction>
				</div>
			</MessageActionsContainer>
		)
	}

	// ── Assistant message actions: Copy + Vote up/down ───────
	return (
		<MessageActionsContainer className="-ml-0.5">
			<MessageAction onClick={handleCopy} tooltip="Copy">
				<CopyIcon />
			</MessageAction>

			{!isReadonly && (
				<>
					<MessageAction
						aria-pressed={vote?.isUpvoted === true}
						data-testid="message-upvote"
						disabled={vote?.isUpvoted === true}
						onClick={() => {
							// TODO(P6): Wire to VoteResolver for functional voting
							toast.info("Voting will be available soon")
						}}
						tooltip="Upvote Response"
					>
						<ThumbUpIcon />
					</MessageAction>

					<MessageAction
						aria-pressed={vote?.isUpvoted === false}
						data-testid="message-downvote"
						disabled={vote !== undefined && vote.isUpvoted === false}
						onClick={() => {
							// TODO(P6): Wire to VoteResolver for functional voting
							toast.info("Voting will be available soon")
						}}
						tooltip="Downvote Response"
					>
						<ThumbDownIcon />
					</MessageAction>
				</>
			)}
		</MessageActionsContainer>
	)
}

// ── Memoized export ──────────────────────────────────────────

export const MessageActions = memo(PureMessageActions, (prev, next) => {
	if (prev.message.id !== next.message.id) return false
	if (!equal(prev.message.parts, next.message.parts)) return false
	if (prev.vote?.isUpvoted !== next.vote?.isUpvoted) return false
	if (prev.setMode !== next.setMode) return false
	return true
})

MessageActions.displayName = "MessageActions"
