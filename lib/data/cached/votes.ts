/**
 * Cached Vote Operations
 * Ref: 03-data-layer-optimal-design.md
 *
 * Cache-integrated vote data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback
 * - WRITE: Write-through (DB first, then cache)
 * - DELETE: Delete from DB, then cache
 * - GUEST: Cache-only
 */
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { UserContext } from "@/lib/cache/types";
import { CacheTags } from "@/lib/cache/tags";
import {
    deleteVoteFromCache,
    getVoteFromCache,
    setVoteInCache,
} from "@/lib/cache-ops/votes";
import type { Vote } from "@/lib/db";
import { isGuest } from "../base";
import type { DataContext } from "../types";
import type { VoteType } from "../votes";
import { deleteVote, getVote, getVotesByChatId, saveVote } from "../votes";

/**
 * Convert DataContext to UserContext for cache operations
 */
function toUserContext(ctx: DataContext): UserContext {
    return {
        userId: ctx.userId,
        isGuest: isGuest(ctx),
    };
}

/**
 * Get vote with cache-first strategy
 *
 * 1. Try cache
 * 2. Guest = cache-only, return null if miss
 * 3. Auth = DB fallback + cache warm
 */
export async function getVoteCached(
    chatId: string,
    messageId: string,
    ctx: DataContext
): Promise<Vote | null> {
    const userCtx = toUserContext(ctx);

    // Try cache first
    const cached = await getVoteFromCache(chatId, messageId, userCtx);
    if (cached !== null) {
        return {
            chatId,
            messageId,
            userId: ctx.userId,
            isUpvoted: cached,
        };
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return null;
    }

    // Auth = DB fallback
    const vote = await getVote(chatId, messageId, ctx);
    if (vote) {
        // Warm cache
        setVoteInCache(chatId, messageId, vote.isUpvoted, userCtx).catch(
            () => {}
        );
    }
    return vote;
}

/**
 * Get all votes for a chat with cache-first strategy
 *
 * Note: Individual votes are cached, but the list operation
 * falls through to DB for authenticated users.
 */
export async function getVotesByChatIdCached(
    chatId: string,
    ctx: DataContext
): Promise<Vote[]> {
    "use cache";
    cacheLife("chatMessages");
    cacheTag(CacheTags.votes(chatId));

    // Guest = no persistence
    if (isGuest(ctx)) {
        return [];
    }

    // For list operations, go directly to DB
    // Individual votes will be cached on access
    return getVotesByChatId(chatId, ctx);
}

/**
 * Save vote with write-through strategy
 *
 * 1. Write to DB (for authenticated users)
 * 2. Update cache
 */
export async function saveVoteCached(
    chatId: string,
    messageId: string,
    type: VoteType,
    ctx: DataContext
): Promise<Vote | null> {
    const userCtx = toUserContext(ctx);
    const isUpvote = type === "up";

    // Guest = cache-only
    if (isGuest(ctx)) {
        await setVoteInCache(chatId, messageId, isUpvote, userCtx);
        return {
            chatId,
            messageId,
            userId: ctx.userId,
            isUpvoted: isUpvote,
        };
    }

    // Auth = write-through
    const vote = await saveVote({ chatId, messageId, type }, ctx);
    if (vote) {
        await setVoteInCache(chatId, messageId, vote.isUpvoted, userCtx);
    }
    return vote;
}

/**
 * Delete vote with write-through strategy
 *
 * 1. Delete from DB (for authenticated users)
 * 2. Delete from cache
 */
export async function deleteVoteCached(
    chatId: string,
    messageId: string,
    ctx: DataContext
): Promise<boolean> {
    const userCtx = toUserContext(ctx);

    // Guest = cache-only
    if (isGuest(ctx)) {
        await deleteVoteFromCache(chatId, messageId, userCtx);
        return true;
    }

    // Auth = write-through
    const deleted = await deleteVote(chatId, messageId, ctx);
    if (deleted) {
        await deleteVoteFromCache(chatId, messageId, userCtx);
    }
    return deleted;
}
