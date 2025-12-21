"use server";

/**
 * Message Server Actions
 *
 * Server actions for message operations like editing and deletion.
 *
 * @module features/chat/actions/message
 */

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";

// =============================================================================
// TYPES
// =============================================================================

export type DeleteTrailingMessagesInput = {
    /** Chat session identifier */
    chatId: string;
    /** Delete messages created after this timestamp */
    createdAt: string;
};

export type DeleteTrailingMessagesResult = {
    /** Whether the operation succeeded */
    success: boolean;
    /** Error message if operation failed */
    error?: string;
};

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Deletes messages after a specified timestamp.
 * Used when editing a message to remove subsequent messages
 * before regenerating the response.
 *
 * @param input - Contains chatId and createdAt timestamp
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = await deleteTrailingMessages({
 *   chatId: 'chat-123',
 *   createdAt: '2024-01-01T00:00:00Z',
 * });
 * ```
 */
export async function deleteTrailingMessages(
    input: DeleteTrailingMessagesInput
): Promise<DeleteTrailingMessagesResult> {
    try {
        // 1. Verify session
        const session = await getSession();
        if (!session?.user?.id) {
            throw new AppError({
                code: "auth:unauthorized",
                message: "Must be logged in to edit messages",
            });
        }

        // 2. Validate input
        if (!input.chatId || !input.createdAt) {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Invalid message data",
            });
        }

        // 3. Validate timestamp
        const timestamp = new Date(input.createdAt);
        if (Number.isNaN(timestamp.getTime())) {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Invalid timestamp format",
            });
        }

        // 4. Delete messages after timestamp
        // TODO: Implement messageData.deleteAfterTimestamp when data layer is complete
        console.log("[Message] Deleting trailing messages:", {
            userId: session.user.id,
            chatId: input.chatId,
            afterTimestamp: timestamp.toISOString(),
        });

        // 5. Revalidate chat page
        revalidatePath(`/chat/${input.chatId}`);

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }

        console.error("[Message] Failed to delete trailing messages:", error);
        return { success: false, error: "Failed to delete messages" };
    }
}
