import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Vote, vote } from "../schema";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all votes for a chat
 *
 * @param chatId - The chat UUID
 * @returns Array of votes
 */
export async function getVotesByChatId(chatId: string): Promise<Vote[]> {
    try {
        return await db.select().from(vote).where(eq(vote.chatId, chatId));
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch votes for chat",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get votes for a chat filtered by user
 *
 * @param chatId - The chat UUID
 * @param userId - The user UUID
 * @returns Array of votes for this user in the chat
 */
export async function getVotesByChatIdAndUserId(
    chatId: string,
    userId: string
): Promise<Vote[]> {
    try {
        return await db
            .select()
            .from(vote)
            .where(and(eq(vote.chatId, chatId), eq(vote.userId, userId)));
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch user votes for chat",
            context: { chatId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get a specific vote by chat, message, and user
 *
 * @param chatId - The chat UUID
 * @param messageId - The message UUID
 * @param userId - The user UUID
 * @returns The vote or null if not found
 */
export async function getVote(
    chatId: string,
    messageId: string,
    userId: string
): Promise<Vote | null> {
    try {
        const [result] = await db
            .select()
            .from(vote)
            .where(
                and(
                    eq(vote.chatId, chatId),
                    eq(vote.messageId, messageId),
                    eq(vote.userId, userId)
                )
            )
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch vote",
            context: { chatId, messageId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
