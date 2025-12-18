import "server-only";

import { desc, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Chat, chat, type MessageRow, message } from "../schema";

// =============================================================================
// TYPES
// =============================================================================

export type ChatWithMessages = Chat & {
    messages: MessageRow[];
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a chat by its ID
 *
 * @param chatId - The chat UUID
 * @returns The chat or null if not found
 */
export async function getChatById(chatId: string) {
    try {
        const [result] = await db
            .select()
            .from(chat)
            .where(eq(chat.id, chatId))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch chat",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get all chats for a user, ordered by most recent first
 *
 * @param userId - The user UUID
 * @param limit - Maximum number of chats to return (default: 50)
 * @returns Array of chats
 */
export async function getChatsByUserId(userId: string, limit = 50) {
    try {
        return await db
            .select()
            .from(chat)
            .where(eq(chat.userId, userId))
            .orderBy(desc(chat.updatedAt))
            .limit(limit);
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch user chats",
            context: { userId, limit },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get a chat with all its messages
 *
 * @param chatId - The chat UUID
 * @returns Chat with messages or null if not found
 */
export async function getChatWithMessages(
    chatId: string
): Promise<ChatWithMessages | null> {
    try {
        const [chatResult] = await db
            .select()
            .from(chat)
            .where(eq(chat.id, chatId))
            .limit(1);

        if (!chatResult) {
            return null;
        }

        const messages = await db
            .select()
            .from(message)
            .where(eq(message.chatId, chatId))
            .orderBy(message.createdAt);

        return {
            ...chatResult,
            messages,
        };
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch chat with messages",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Check if a user has access to a chat
 *
 * @param chatId - The chat UUID
 * @param userId - The user UUID
 * @returns true if user owns the chat or chat is public
 */
export async function canUserAccessChat(
    chatId: string,
    userId: string
): Promise<boolean> {
    try {
        const [result] = await db
            .select({ userId: chat.userId, visibility: chat.visibility })
            .from(chat)
            .where(eq(chat.id, chatId))
            .limit(1);

        if (!result) {
            return false;
        }

        return result.userId === userId || result.visibility === "public";
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to check chat access",
            context: { chatId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
