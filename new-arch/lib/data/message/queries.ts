import "server-only";

import { asc, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type MessageRow, message } from "../schema";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all messages for a chat, ordered by creation time (oldest first)
 *
 * @param chatId - The chat UUID
 * @returns Array of messages
 */
export async function getMessagesByChatId(
    chatId: string
): Promise<MessageRow[]> {
    try {
        return await db
            .select()
            .from(message)
            .where(eq(message.chatId, chatId))
            .orderBy(asc(message.createdAt));
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch messages for chat",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get a single message by its ID
 *
 * @param messageId - The message UUID
 * @returns The message or null if not found
 */
export async function getMessageById(
    messageId: string
): Promise<MessageRow | null> {
    try {
        const [result] = await db
            .select()
            .from(message)
            .where(eq(message.id, messageId))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch message",
            context: { messageId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
