"use server";

/**
 * Vote Server Actions
 *
 * Server actions for upvoting and downvoting messages.
 *
 * @module features/chat/actions/vote
 */

import { updateTag } from "next/cache";
import { getSessionCached } from "@/lib/auth";
import { CacheTags } from "@/lib/cache";
import { createContext, deleteVoteCached, saveVoteCached } from "@/lib/data";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
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
        const session = await getSessionCached();
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

        // 3. Create data context and persist vote
        const ctx = createContext(session.user.id, session.user.type);
        const result = await saveVoteCached(
            input.chatId,
            input.messageId,
            input.vote,
            ctx
        );

        if (!result) {
            throw new AppError({
                code: "resource:not_found",
                message: "Chat not found or access denied",
            });
        }

        // 4. Invalidate vote cache for read-your-writes consistency
        updateTag(CacheTags.votes(input.chatId));

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }
        logger.errorWithCause("[Vote] Failed to save vote", error);
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
        const session = await getSessionCached();
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

        // 3. Create data context and remove vote
        const ctx = createContext(session.user.id, session.user.type);
        await deleteVoteCached(chatId, messageId, ctx);

        // 4. Invalidate vote cache for read-your-writes consistency
        updateTag(CacheTags.votes(chatId));

        return { success: true };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: error.message };
        }
        logger.errorWithCause("[Vote] Failed to remove vote", error);
        return { success: false, error: "Failed to remove vote" };
    }
}
