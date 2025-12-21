/**
 * Vote Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing vote data in Redis
 *
 * @module lib/cache-ops/votes
 */
import "server-only";

import { getRedis } from "@/lib/cache/client";
import { CacheKeys } from "@/lib/cache/keys";
import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { getTTLForUser } from "@/lib/cache/helpers";
import type { UserContext } from "@/lib/cache/types";

/**
 * Get vote from cache
 *
 * Return value semantics:
 * - true: Upvoted
 * - false: Downvoted
 * - null: Cache miss or cache unavailable
 *
 * @param chatId - Chat identifier
 * @param messageId - Message identifier
 * @param ctx - User context
 * @returns Vote state or null if not in cache
 */
export async function getVoteFromCache(
    chatId: string,
    messageId: string,
    ctx: UserContext
): Promise<boolean | null> {
    return withCircuitBreaker(
        "getVoteFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const key = CacheKeys.vote(chatId, messageId, ctx.userId);
            const data = await redis.get<string>(key);

            if (data === null) {
                return null;
            }

            return data === "1";
        },
        null
    );
}

/**
 * Set vote in cache
 *
 * @param chatId - Chat identifier
 * @param messageId - Message identifier
 * @param isUpvote - Whether this is an upvote (true) or downvote (false)
 * @param ctx - User context
 * @returns true if successful, false otherwise
 */
export async function setVoteInCache(
    chatId: string,
    messageId: string,
    isUpvote: boolean,
    ctx: UserContext
): Promise<boolean> {
    return withCircuitBreaker(
        "setVoteInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const key = CacheKeys.vote(chatId, messageId, ctx.userId);
            const ttl = getTTLForUser(ctx.isGuest);
            await redis.set(key, isUpvote ? "1" : "0", { ex: ttl });

            return true;
        },
        false
    );
}

/**
 * Delete vote from cache
 *
 * @param chatId - Chat identifier
 * @param messageId - Message identifier
 * @param ctx - User context
 * @returns true if successful, false otherwise
 */
export async function deleteVoteFromCache(
    chatId: string,
    messageId: string,
    ctx: UserContext
): Promise<boolean> {
    return withCircuitBreaker(
        "deleteVoteFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const key = CacheKeys.vote(chatId, messageId, ctx.userId);
            await redis.del(key);

            return true;
        },
        false
    );
}
