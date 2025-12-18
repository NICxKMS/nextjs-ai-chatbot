import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type DBMessage, type MessageRow, message } from "../schema";

// =============================================================================
// TYPES
// =============================================================================

export type CreateMessageInput = {
    id?: string;
    chatId: string;
    role: "user" | "assistant";
    parts: unknown;
    attachments: unknown;
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a single message
 *
 * @param input - Message creation data
 * @returns The created message
 */
export async function createMessage(
    input: CreateMessageInput
): Promise<MessageRow> {
    const { id, chatId, role, parts, attachments } = input;

    try {
        const values: DBMessage = {
            chatId,
            role,
            parts,
            attachments,
            ...(id !== undefined && { id }),
        };

        const [result] = await db.insert(message).values(values).returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to create message - no result returned",
                context: { chatId, role },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create message",
            context: { chatId, role },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Create multiple messages in batch
 *
 * @param inputs - Array of message creation data
 * @returns Array of created messages
 */
export async function createMessages(
    inputs: CreateMessageInput[]
): Promise<MessageRow[]> {
    if (inputs.length === 0) {
        return [];
    }

    try {
        const values: DBMessage[] = inputs.map((input) => ({
            chatId: input.chatId,
            role: input.role,
            parts: input.parts,
            attachments: input.attachments,
            ...(input.id !== undefined && { id: input.id }),
        }));

        return await db.insert(message).values(values).returning();
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create messages batch",
            context: { count: inputs.length },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Update an existing message
 *
 * @param messageId - The message UUID
 * @param input - Fields to update (parts and/or attachments)
 * @returns The updated message or null if not found
 */
export async function updateMessage(
    messageId: string,
    input: { parts?: unknown; attachments?: unknown }
): Promise<MessageRow | null> {
    try {
        const [result] = await db
            .update(message)
            .set(input as Partial<typeof message.$inferInsert>)
            .where(eq(message.id, messageId))
            .returning();

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to update message",
            context: { messageId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete all messages for a chat
 *
 * @param chatId - The chat UUID
 * @returns Number of deleted messages
 */
export async function deleteMessagesByChatId(chatId: string): Promise<number> {
    try {
        const result = await db
            .delete(message)
            .where(eq(message.chatId, chatId))
            .returning({ id: message.id });

        return result.length;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete messages for chat",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete all messages in a chat created after a specific timestamp
 * Useful for regenerating responses from a certain point
 *
 * @param chatId - The chat UUID
 * @param timestamp - Delete messages created after this time
 * @returns Number of deleted messages
 */
export async function deleteMessagesAfterTimestamp(
    chatId: string,
    timestamp: Date
): Promise<number> {
    try {
        const result = await db
            .delete(message)
            .where(
                and(
                    eq(message.chatId, chatId),
                    gt(message.createdAt, timestamp)
                )
            )
            .returning({ id: message.id });

        return result.length;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete messages after timestamp",
            context: { chatId, timestamp: timestamp.toISOString() },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
