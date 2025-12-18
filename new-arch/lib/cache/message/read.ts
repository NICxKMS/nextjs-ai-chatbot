import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getChatKeys } from "../keys";
import { type CachedMessage, DEFAULT_CACHE_CONFIG } from "../types";

/**
 * Get messages from cache for a chat.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @param options - Optional limit/offset for pagination
 * @returns Array of messages or empty array if not found/unavailable
 */
export async function getMessagesFromCache(
    chatId: string,
    userId: string,
    options?: {
        /** Start index (0-based). Default: 0 */
        start?: number;
        /** End index (inclusive). Default: -1 (all) */
        end?: number;
        /** Max messages to return. Default: from config */
        limit?: number;
    }
): Promise<CachedMessage[]> {
    const redis = getRedisClient();
    if (!redis) {
        return [];
    }

    return await withCircuitBreaker("getMessagesFromCache", [], async () => {
        const { msgsKey } = getChatKeys(chatId, userId);

        const start = options?.start ?? 0;
        const limit = options?.limit ?? DEFAULT_CACHE_CONFIG.maxMessagesPerRead;
        const end = options?.end ?? start + limit - 1;

        // Use ZRANGE to get messages in order
        const messages = (await redis.zrange(
            msgsKey,
            start,
            end
        )) as CachedMessage[];
        return messages ?? [];
    });
}

/**
 * Get messages from cache by time range.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @param minTime - Minimum timestamp (inclusive)
 * @param maxTime - Maximum timestamp (inclusive)
 * @returns Array of messages in the time range
 */
export async function getMessagesByTimeRange(
    chatId: string,
    userId: string,
    minTime: Date | number,
    maxTime: Date | number
): Promise<CachedMessage[]> {
    const redis = getRedisClient();
    if (!redis) {
        return [];
    }

    return await withCircuitBreaker("getMessagesByTimeRange", [], async () => {
        const { msgsKey } = getChatKeys(chatId, userId);

        const min = typeof minTime === "number" ? minTime : minTime.getTime();
        const max = typeof maxTime === "number" ? maxTime : maxTime.getTime();

        const messages = (await redis.zrange(msgsKey, min, max, {
            byScore: true,
        })) as CachedMessage[];
        return messages ?? [];
    });
}

/**
 * Get message count for a chat.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @returns Number of messages or 0 if not found/unavailable
 */
export async function getMessageCount(
    chatId: string,
    userId: string
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    return await withCircuitBreaker("getMessageCount", 0, async () => {
        const { msgsKey } = getChatKeys(chatId, userId);
        return await redis.zcard(msgsKey);
    });
}
