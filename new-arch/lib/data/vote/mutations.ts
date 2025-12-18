import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Vote, vote } from "../schema";

// =============================================================================
// TYPES
// =============================================================================

export type VoteInput = {
    chatId: string;
    messageId: string;
    userId: string;
    type: "up" | "down";
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create or update a vote on a message
 *
 * Uses upsert to handle concurrent requests atomically.
 *
 * @param input - Vote creation/update data
 * @returns The created/updated vote
 */
export async function upsertVote(input: VoteInput): Promise<Vote> {
    const { chatId, messageId, userId, type } = input;
    const isUpvoted = type === "up";

    try {
        const [result] = await db
            .insert(vote)
            .values({
                chatId,
                messageId,
                userId,
                isUpvoted,
            })
            .onConflictDoUpdate({
                target: [vote.chatId, vote.messageId, vote.userId],
                set: { isUpvoted },
            })
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to upsert vote - no result returned",
                context: { chatId, messageId, userId },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to upsert vote",
            context: { chatId, messageId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete a vote
 *
 * @param chatId - The chat UUID
 * @param messageId - The message UUID
 * @param userId - The user UUID
 * @returns true if deleted, false if not found
 */
export async function deleteVote(
    chatId: string,
    messageId: string,
    userId: string
): Promise<boolean> {
    try {
        const result = await db
            .delete(vote)
            .where(
                and(
                    eq(vote.chatId, chatId),
                    eq(vote.messageId, messageId),
                    eq(vote.userId, userId)
                )
            )
            .returning({ chatId: vote.chatId });

        return result.length > 0;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete vote",
            context: { chatId, messageId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
