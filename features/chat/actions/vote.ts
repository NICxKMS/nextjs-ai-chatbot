"use server";

/**
 * Vote Server Actions
 *
 * Server actions for upvoting and downvoting messages.
 *
 * @module features/chat/actions/vote
 */

import { getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { VoteType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type VoteInput = {
    /** Chat session identifier */
    chatId: string;
    /** Message identifier */
    messageId: string;
    /** Vote type (up or down) */
    vote: VoteType;
};

export type VoteResult = {
    /** Whether the vote operation succeeded */
    success: boolean;
    /** Error message if operation failed */
    error?: string;
};

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Submits a vote on a chat message.
 *
 * @param input - Vote input containing chatId, messageId, and vote type
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = await voteOnMessage({
 *   chatId: 'chat-123',
 *   messageId: 'msg-456',
 *   vote: 'up',
 * });
 *
 * if (result.success) {
 *   console.log('Vote recorded');
 * }
 * ```
 */
export async function voteOnMessage(input: VoteInput): Promise<VoteResult> {
    try {
        // 1. Verify session
        const session = await getSession();
        if (!session?.user?.id) {
            throw new AppError({
                code: "auth:unauthorized",
                message: "Must be logged in to vote",
            });
        }

        // 2. Validate input
        if (!input.chatId || !input.messageId || !input.vote) {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Invalid vote data",
            });
        }

        if (input.vote !== "up" && input.vote !== "down") {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Vote must be up or down",
            });
        }

        // 3. Check if user owns the chat or has access
        // For now, allow voting on any message the user can see

        // 4. Upsert vote in database
        // TODO: Add chatData.write.upsertVote() when implementing full data layer
        console.log("[Vote] Saving vote:", {
            userId: session.user.id,
            chatId: input.chatId,
            messageId: input.messageId,
            vote: input.vote,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }
        console.error("[Vote] Failed to save vote:", error);
        return { success: false, error: "Failed to save vote" };
    }
}

/**
 * Removes a vote from a chat message.
 *
 * @param chatId - Chat session identifier
 * @param messageId - Message identifier
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = await removeVote('chat-123', 'msg-456');
 *
 * if (result.success) {
 *   console.log('Vote removed');
 * }
 * ```
 */
export async function removeVote(
    chatId: string,
    messageId: string
): Promise<VoteResult> {
    try {
        // 1. Verify session
        const session = await getSession();
        if (!session?.user?.id) {
            throw new AppError({
                code: "auth:unauthorized",
                message: "Must be logged in",
            });
        }

        // 2. Validate input
        if (!chatId || !messageId) {
            throw new AppError({
                code: "validation:invalid_input",
                message: "Missing chatId or messageId",
            });
        }

        // 3. Remove vote from database
        // TODO: Add chatData.write.removeVote() when implementing full data layer
        console.log("[Vote] Removing vote:", {
            userId: session.user.id,
            chatId,
            messageId,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }
        console.error("[Vote] Failed to remove vote:", error);
        return { success: false, error: "Failed to remove vote" };
    }
}
