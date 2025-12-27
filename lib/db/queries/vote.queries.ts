/**
 * Vote Queries
 * @module @/lib/db/queries/vote
 */
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { type NewVote, type Vote, vote } from "../schema";

export async function findVoteByMessageAndUser(
	chatId: string,
	messageId: string,
	userId: string,
): Promise<Vote | null> {
	const result = await db
		.select()
		.from(vote)
		.where(
			and(
				eq(vote.chatId, chatId),
				eq(vote.messageId, messageId),
				eq(vote.userId, userId),
			),
		)
		.limit(1);
	return result[0] ?? null;
}

export async function upsertVote(data: NewVote): Promise<Vote> {
	const result = await db
		.insert(vote)
		.values(data)
		.onConflictDoUpdate({
			target: [vote.chatId, vote.messageId, vote.userId],
			set: { isUpvoted: data.isUpvoted },
		})
		.returning();
	if (!result[0]) throw new Error("Failed to upsert vote");
	return result[0];
}

export async function deleteVote(
	chatId: string,
	messageId: string,
	userId: string,
): Promise<boolean> {
	const result = await db
		.delete(vote)
		.where(
			and(
				eq(vote.chatId, chatId),
				eq(vote.messageId, messageId),
				eq(vote.userId, userId),
			),
		)
		.returning({ chatId: vote.chatId });
	return result.length > 0;
}
