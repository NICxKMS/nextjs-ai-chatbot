"use client"

import { memo } from "react"

import { MessageAction } from "@/components/ai-elements/message"
import { ThumbDownIcon, ThumbUpIcon } from "@/components/icons"
import { useSession } from "@/features/auth/components/session-provider"
import type { Vote } from "@/lib/types/models.types"

// ── Types ────────────────────────────────────────────────────

interface VoteButtonsProps {
	/** Message ID to vote on */
	messageId: string
	/** Whether this is an assistant message (only show for assistant) */
	isAssistant: boolean
	/** Whether chat is currently loading/streaming */
	isLoading: boolean
	/** Current vote state for this message */
	vote?: Vote
	/** Callback to submit a vote (provided by useVotes / VotesProvider) */
	onVote?: (messageId: string, type: "up" | "down") => void
}

// ── Component ────────────────────────────────────────────────

/**
 * Upvote/Downvote buttons for assistant messages.
 *
 * - Only rendered for assistant messages (`isAssistant` must be true)
 * - Hidden while streaming/loading
 * - Hidden for guest users (guests cannot vote)
 * - Active vote shows a highlighted/filled icon with full opacity
 * - Already-voted button is disabled (no-op) with `aria-pressed` true
 */
function PureVoteButtons({ messageId, isAssistant, isLoading, vote, onVote }: VoteButtonsProps) {
	const { isGuest } = useSession()

	// Only show for assistant messages
	if (!isAssistant) return null

	// Hide while loading/streaming
	if (isLoading) return null

	// Guest users cannot vote — hide buttons entirely
	if (isGuest) return null

	const isUpvoted = vote?.isUpvoted === true
	const isDownvoted = vote !== undefined && vote.isUpvoted === false

	return (
		<>
			<MessageAction
				aria-pressed={isUpvoted}
				className={isUpvoted ? "text-foreground disabled:opacity-100" : undefined}
				data-testid="message-upvote"
				disabled={isUpvoted}
				onClick={() => onVote?.(messageId, "up")}
				tooltip="Upvote Response"
			>
				<ThumbUpIcon />
			</MessageAction>

			<MessageAction
				aria-pressed={isDownvoted}
				className={isDownvoted ? "text-foreground disabled:opacity-100" : undefined}
				data-testid="message-downvote"
				disabled={isDownvoted}
				onClick={() => onVote?.(messageId, "down")}
				tooltip="Downvote Response"
			>
				<ThumbDownIcon />
			</MessageAction>
		</>
	)
}

// ── Memoized export ──────────────────────────────────────────

export const VoteButtons = memo(PureVoteButtons, (prev, next) => {
	if (prev.messageId !== next.messageId) return false
	if (prev.isAssistant !== next.isAssistant) return false
	if (prev.isLoading !== next.isLoading) return false
	if (prev.vote?.isUpvoted !== next.vote?.isUpvoted) return false
	if (prev.onVote !== next.onVote) return false
	return true
})

VoteButtons.displayName = "VoteButtons"
