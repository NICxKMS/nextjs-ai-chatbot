import { and, eq } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { votes } from "@/lib/db/schema"
import type { Vote } from "@/lib/types/models.types"

/**
 * Get all votes for a chat by a specific user.
 */
export async function getVotesByChatId(chatId: string, userId: string): Promise<Vote[]> {
	try {
		return await db
			.select()
			.from(votes)
			.where(and(eq(votes.chatId, chatId), eq(votes.userId, userId)))
	} catch (error) {
		throwDatabaseError(error, "Failed to get votes for chat", { chatId })
	}
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
	try {
		const [vote] = await db
			.insert(votes)
			.values(data)
			.onConflictDoUpdate({
				target: [votes.chatId, votes.messageId, votes.userId],
				set: { isUpvoted: data.isUpvoted },
			})
			.returning()
		return requireDatabaseRow(vote, "Vote upsert returned no rows", {
			chatId: data.chatId,
			messageId: data.messageId,
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to upsert vote", {
			chatId: data.chatId,
			messageId: data.messageId,
		})
	}
}

/**
 * Delete all votes for a chat by a specific user.
 *
 * @unused FK cascade on `chats.id → votes.chatId` handles
 * cleanup during chat deletion. Retained for selective vote removal.
 */
export async function deleteVotesByChatId(chatId: string, userId: string): Promise<void> {
	try {
		await db.delete(votes).where(and(eq(votes.chatId, chatId), eq(votes.userId, userId)))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete votes for chat", { chatId })
	}
}
