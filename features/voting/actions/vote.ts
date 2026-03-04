"use server"

import { voteSchema } from "@/features/voting/types/vote.types"
import { getAppSession } from "@/lib/auth/session"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { invalidateVotes } from "@/lib/cache/revalidate"
import { getChatById } from "@/lib/data/chat"
import { getMessageById } from "@/lib/data/message"
import { upsertVote } from "@/lib/data/vote"
import type { ActionResult } from "@/lib/types/result.types"

/** Maximum votes per user per minute. */
const VOTE_RATE_LIMIT = 20
/** Rate limit window in seconds (1 minute). */
const VOTE_RATE_WINDOW_SECONDS = 60

/**
 * Vote on a message (upvote or downvote).
 *
 * Flow: auth check → guest rejection → input validation → chat ownership →
 * message-in-chat verification (IDOR protection) → rate limit → upsert vote → invalidate cache.
 *
 * This is a Server Action — NOT an API route.
 * Returns ActionResult for optimistic reconciliation on the client.
 */
export async function voteOnMessage(
	input: unknown,
): Promise<ActionResult<{ messageId: string; type: "up" | "down" }>> {
	// 1. Auth — reject unauthenticated
	const session = await getAppSession()
	if (!session) {
		return {
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		}
	}

	// 2. Auth — reject guests (guests cannot vote)
	if (session.user.type === "guest") {
		return {
			success: false,
			error: { code: "forbidden:auth:guest_restricted", message: "Guests cannot vote" },
		}
	}

	// 3. Validate input
	const parsed = voteSchema.safeParse(input)
	if (!parsed.success) {
		return {
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid vote input" },
		}
	}

	const { chatId, messageId, type } = parsed.data

	// 4. Authorize — verify chat ownership
	const chat = await getChatById(chatId)
	if (!chat) {
		return {
			success: false,
			error: { code: "not_found:chat:chat_not_found", message: "Chat not found" },
		}
	}

	if (chat.userId !== session.user.id) {
		return {
			success: false,
			error: {
				code: "forbidden:chat:owner_mismatch",
				message: "Not authorized to vote in this chat",
			},
		}
	}

	// 5. Authorize — verify message belongs to this chat (IDOR protection)
	const message = await getMessageById(messageId)
	if (!message || message.chatId !== chatId) {
		return {
			success: false,
			error: {
				code: "not_found:vote:message_not_in_chat",
				message: "Message not found in this chat",
			},
		}
	}

	// 6. Rate limit — 20 votes/min per user (graceful: skip if Redis unavailable)
	const rateLimitKey = rateLimitKeys.rateLimitVote(session.user.id)
	const count = await incr(rateLimitKey)
	if (count !== null) {
		if (count === 1) {
			await expire(rateLimitKey, VOTE_RATE_WINDOW_SECONDS)
		}
		if (count > VOTE_RATE_LIMIT) {
			return {
				success: false,
				error: {
					code: "rate_limit:vote:too_many_requests",
					message: "Too many votes. Please try again later.",
				},
			}
		}
	}

	// 7. Execute — upsert vote via data layer
	try {
		await upsertVote({
			chatId,
			messageId,
			userId: session.user.id,
			isUpvoted: type === "up",
		})
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to save vote",
			},
		}
	}

	// 8. Invalidate vote cache for this chat
	invalidateVotes(chatId)

	return { success: true, data: { messageId, type } }
}
