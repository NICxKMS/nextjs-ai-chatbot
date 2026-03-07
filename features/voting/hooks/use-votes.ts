"use client"

import { useCallback, useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { voteOnMessage } from "@/features/voting/actions/vote"
import type { Vote } from "@/lib/types/models.types"

/**
 * Hook for managing optimistic vote state for a chat.
 *
 * Uses React 19 `useOptimistic` for instant UI updates.
 * On vote: optimistically updates local vote state, then calls
 * `voteOnMessage` Server Action for persistence. On failure:
 * `useOptimistic` automatically reverts to the base state when the
 * transition settles, and a toast error is shown.
 *
 * @param chatId - The chat ID to scope votes to
 * @param initialVotes - Server-resolved votes (source of truth after revalidation)
 * @returns votes array, submitVote callback, and pending state
 */
export function useVotes(chatId: string, initialVotes: Vote[]) {
	const [optimisticVotes, addOptimisticVote] = useOptimistic<
		Vote[],
		{ messageId: string; type: "up" | "down" }
	>(initialVotes, (currentVotes, { messageId, type }) => {
		// Replace any existing vote for this message with the new one
		const filtered = currentVotes.filter((v) => v.messageId !== messageId)
		return [
			...filtered,
			{
				chatId,
				messageId,
				userId: "", // Placeholder — not used for display logic
				isUpvoted: type === "up",
			},
		]
	})

	const [, startTransition] = useTransition()

	const submitVote = useCallback(
		(messageId: string, type: "up" | "down") => {
			startTransition(async () => {
				// Optimistic update — shown immediately
				addOptimisticVote({ messageId, type })

				const result = await voteOnMessage({ chatId, messageId, type })

				if (!result.success) {
					// useOptimistic automatically reverts when the transition settles
					toast.error(result.error.message)
				}
			})
		},
		[addOptimisticVote, chatId],
	)

	return { votes: optimisticVotes, submitVote }
}
