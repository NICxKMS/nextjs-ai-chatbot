import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Chat, chat } from "../schema";

// =============================================================================
// TYPES
// =============================================================================

export type CreateChatInput = {
    id?: string | undefined;
    userId: string;
    title?: string | undefined;
    visibility?: "public" | "private" | undefined;
};

export type UpdateChatInput = {
    title?: string | undefined;
    visibility?: "public" | "private" | undefined;
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new chat
 *
 * @param input - Chat creation data
 * @returns The created chat
 */
export async function createChat(input: CreateChatInput): Promise<Chat> {
    const { id, userId, title, visibility } = input;

    try {
        // Build values object, omitting undefined fields
        const values = {
            userId,
            ...(id !== undefined && { id }),
            ...(title !== undefined && { title }),
            ...(visibility !== undefined && { visibility }),
        };

        const [result] = await db
            .insert(chat)
            .values(values as typeof chat.$inferInsert)
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to create chat - no result returned",
                context: { userId },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create chat",
            context: { userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Update an existing chat
 *
 * @param chatId - The chat UUID
 * @param userId - The owner's UUID (for authorization)
 * @param input - Fields to update
 * @returns The updated chat or null if not found/unauthorized
 */
export async function updateChat(
    chatId: string,
    userId: string,
    input: UpdateChatInput
): Promise<Chat | null> {
    try {
        const [result] = await db
            .update(chat)
            .set(input as Partial<typeof chat.$inferInsert>)
            .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
            .returning();

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to update chat",
            context: { chatId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete a chat and all related data (cascades)
 *
 * @param chatId - The chat UUID
 * @param userId - The owner's UUID (for authorization)
 * @returns true if deleted, false if not found/unauthorized
 */
export async function deleteChat(
    chatId: string,
    userId: string
): Promise<boolean> {
    try {
        const result = await db
            .delete(chat)
            .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
            .returning({ id: chat.id });

        return result.length > 0;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete chat",
            context: { chatId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Update chat visibility
 *
 * @param chatId - The chat UUID
 * @param userId - The owner's UUID (for authorization)
 * @param visibility - New visibility setting
 * @returns The updated chat or null if not found/unauthorized
 */
export function updateChatVisibility(
    chatId: string,
    userId: string,
    visibility: "public" | "private"
): Promise<Chat | null> {
    return updateChat(chatId, userId, { visibility });
}
