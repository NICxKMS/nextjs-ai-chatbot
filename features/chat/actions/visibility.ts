"use server";

/**
 * Visibility Server Actions
 *
 * Server actions for updating chat visibility.
 *
 * @module features/chat/actions/visibility
 */

import { revalidatePath, updateTag } from "next/cache";
import { getSessionCached } from "@/lib/auth";
import { CacheTags } from "@/lib/cache";
import { updateChatVisibilityCached } from "@/lib/data/cached";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import type { VisibilityType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type UpdateVisibilityInput = {
    /** Chat session identifier */
    chatId: string;
    /** New visibility type */
    visibility: VisibilityType;
};

export type UpdateVisibilityResult = {
    /** Whether the operation succeeded */
    success: boolean;
    /** Error message if operation failed */
    error?: string;
};

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Updates the visibility of a chat.
 *
 * @param input - Contains chatId and new visibility type
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = await updateChatVisibility({
 *   chatId: 'chat-123',
 *   visibility: 'public',
 * });
 * ```
 */
export async function updateChatVisibility(
    input: UpdateVisibilityInput
): Promise<UpdateVisibilityResult> {
    try {
        // 1. Verify session
        const session = await getSessionCached();
        if (!session?.user?.id) {
            throw new AppError({
                code: "auth:unauthorized",
                message: "Must be logged in to update chat visibility",
            });
        }

        // 2. Validate input
        if (!input.chatId || !input.visibility) {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Invalid visibility data",
            });
        }

        if (input.visibility !== "public" && input.visibility !== "private") {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Visibility must be public or private",
            });
        }

        // 3. Update visibility in database
        await updateChatVisibilityCached(input.chatId, input.visibility, {
            userId: session.user.id,
            userType: "regular",
        });

        // 4. Invalidate cache tags for read-your-writes consistency
        // updateTag MUST be called BEFORE revalidatePath for immediate user visibility
        updateTag(CacheTags.chat(input.chatId));
        updateTag(CacheTags.userChats(session.user.id));

        // 5. Revalidate chat page for other users
        revalidatePath(`/chat/${input.chatId}`);

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }

        logger.errorWithCause(
            "[Visibility] Failed to update visibility",
            error
        );
        return { success: false, error: "Failed to update visibility" };
    }
}
