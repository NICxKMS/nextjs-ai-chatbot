import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { votes } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
import type { Vote } from "@/lib/types/models.types"

/**
 * Get all votes for a chat by a specific user.
 */
export async function getVotesByChatId(chatId: string, userId: string): Promise<Vote[]> {
	return db
		.select()
		.from(votes)
		.where(and(eq(votes.chatId, chatId), eq(votes.userId, userId)))
}

/**
 * Insert or update a vote using ON CONFLICT DO UPDATE on the composite PK.
 */
export async function upsertVote(data: {
	chatId: string
	messageId: string
	userId: string
	isUpvoted: boolean
}): Promise<Vote> {
	const [vote] = await db
		.insert(votes)
		.values(data)
		.onConflictDoUpdate({
			target: [votes.chatId, votes.messageId, votes.userId],
			set: { isUpvoted: data.isUpvoted },
		})
		.returning()
	if (!vote) {
		throw AppError.internal("Vote upsert returned no rows", {
			chatId: data.chatId,
			messageId: data.messageId,
		})
	}
	return vote
}

/**
 * Delete all votes for a chat by a specific user.
 */
export async function deleteVotesByChatId(chatId: string, userId: string): Promise<void> {
	await db.delete(votes).where(and(eq(votes.chatId, chatId), eq(votes.userId, userId)))
}
