import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getChatKeys } from "../keys";

/**
 * Delete all messages from cache for a chat.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteMessagesFromCache(
    chatId: string,
    userId: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "deleteMessagesFromCache",
        false,
        async () => {
            const { msgsKey } = getChatKeys(chatId, userId);
            await redis.del(msgsKey);
            return true;
        }
    );
}

/**
 * Delete messages from cache by time range.
 * Useful for cleanup operations.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @param minTime - Minimum timestamp (inclusive)
 * @param maxTime - Maximum timestamp (inclusive)
 * @returns Number of messages deleted
 */
export async function deleteMessagesByTimeRange(
    chatId: string,
    userId: string,
    minTime: Date | number,
    maxTime: Date | number
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    return await withCircuitBreaker(
        "deleteMessagesByTimeRange",
        0,
        async () => {
            const { msgsKey } = getChatKeys(chatId, userId);

            const min =
                typeof minTime === "number" ? minTime : minTime.getTime();
            const max =
                typeof maxTime === "number" ? maxTime : maxTime.getTime();

            return await redis.zremrangebyscore(msgsKey, min, max);
        }
    );
}

/**
 * Delete messages after a specific timestamp.
 * Useful for rolling back to a point in time.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @param timestamp - Delete all messages after this time
 * @returns Number of messages deleted
 */
export async function deleteMessagesAfter(
    chatId: string,
    userId: string,
    timestamp: Date | number
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    return await withCircuitBreaker("deleteMessagesAfter", 0, async () => {
        const { msgsKey } = getChatKeys(chatId, userId);

        const min =
            typeof timestamp === "number" ? timestamp : timestamp.getTime();
        // +inf to get all messages after the timestamp
        return await redis.zremrangebyscore(msgsKey, min + 1, "+inf");
    });
}
