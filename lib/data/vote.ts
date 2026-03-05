import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { votes } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get votes for chat",
			{ chatId, cause: error },
		)
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
		if (!vote) {
			throw AppError.internal(
				"internal_error:database:query_failed",
				"Vote upsert returned no rows",
				{
					chatId: data.chatId,
					messageId: data.messageId,
				},
			)
		}
		return vote
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal("internal_error:database:query_failed", "Failed to upsert vote", {
			chatId: data.chatId,
			messageId: data.messageId,
			cause: error,
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to delete votes for chat",
			{ chatId, cause: error },
		)
	}
}
