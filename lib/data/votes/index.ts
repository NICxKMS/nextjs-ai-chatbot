/**
 * Vote Data Module
 * Ref: 03-data-layer-optimal-design.md
 *
 * Data access layer for vote operations
 */
import "server-only";

import { eq, and } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import type { Vote, NewVote } from "@/lib/db/schema";
import type { DataContext } from "../types";
import { isGuest } from "../base";

const { vote, chat } = schema;

/**
 * Vote type enum
 */
export type VoteType = "up" | "down";

/**
 * Parameters for saving a vote
 */
export interface SaveVoteParams {
    chatId: string;
    messageId: string;
    type: VoteType;
}

/**
 * Vote data access object
 */
export const voteData = {
    /**
     * Get votes for a chat
     */
    getByChatId: async (chatId: string, ctx: DataContext): Promise<Vote[]> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return [];
        }

        const db = getDb();
        return await db
            .select()
            .from(vote)
            .where(and(eq(vote.chatId, chatId), eq(vote.userId, ctx.userId)));
    },

    /**
     * Get a specific vote
     */
    get: async (
        chatId: string,
        messageId: string,
        ctx: DataContext
    ): Promise<Vote | null> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return null;
        }

        const db = getDb();
        const [result] = await db
            .select()
            .from(vote)
            .where(
                and(
                    eq(vote.chatId, chatId),
                    eq(vote.messageId, messageId),
                    eq(vote.userId, ctx.userId)
                )
            );

        return result ?? null;
    },

    /**
     * Save or update a vote (upsert)
     * Uses ON CONFLICT for atomic upsert
     */
    save: async (
        params: SaveVoteParams,
        ctx: DataContext
    ): Promise<Vote | null> => {
        const { chatId, messageId, type } = params;

        // Guest users: no persistence
        if (isGuest(ctx)) {
            return {
                chatId,
                messageId,
                userId: ctx.userId,
                isUpvoted: type === "up",
            } as Vote;
        }

        const db = getDb();
        const isUpvoted = type === "up";

        // Verify chat ownership first (IDOR protection)
        const [chatResult] = await db
            .select({ id: chat.id })
            .from(chat)
            .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

        if (!chatResult) {
            return null;
        }

        // Upsert vote atomically
        const [result] = await db
            .insert(vote)
            .values({
                chatId,
                messageId,
                userId: ctx.userId,
                isUpvoted,
            })
            .onConflictDoUpdate({
                target: [vote.chatId, vote.messageId],
                set: { isUpvoted },
            })
            .returning();

        return result ?? null;
    },

    /**
     * Delete a vote
     */
    delete: async (
        chatId: string,
        messageId: string,
        ctx: DataContext
    ): Promise<boolean> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return false;
        }

        const db = getDb();
        const result = await db
            .delete(vote)
            .where(
                and(
                    eq(vote.chatId, chatId),
                    eq(vote.messageId, messageId),
                    eq(vote.userId, ctx.userId)
                )
            )
            .returning();

        return result.length > 0;
    },
} as const;

// Re-export individual functions for tree-shaking
export const getVote = voteData.get;
export const getVotesByChatId = voteData.getByChatId;
export const saveVote = voteData.save;
export const deleteVote = voteData.delete;
