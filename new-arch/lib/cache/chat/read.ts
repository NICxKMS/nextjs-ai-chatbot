import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getChatKeys } from "../keys";
import type { CachedChat, CachedChatMeta, CachedMessage } from "../types";

/**
 * Get full chat from cache (metadata + messages).
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @returns CachedChat or null if not found/unavailable
 */
export async function getChatFromCache(
    chatId: string,
    userId: string
): Promise<CachedChat | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    return await withCircuitBreaker("getChatFromCache", null, async () => {
        const { metaKey, msgsKey } = getChatKeys(chatId, userId);

        // Pipeline: get metadata and messages in parallel
        const pipeline = redis.pipeline();
        pipeline.get(metaKey);
        pipeline.zrange(msgsKey, 0, -1);

        const [metaResult, msgsResult] = await pipeline.exec();

        const meta = metaResult as CachedChatMeta | null;
        if (!meta) {
            return null;
        }

        const messages = (msgsResult as CachedMessage[]) ?? [];

        return {
            ...meta,
            messages,
        };
    });
}

/**
 * Get only chat metadata from cache (without messages).
 * Faster for listing and summary operations.
 *
 * @param chatId - Chat ID
 * @param userId - User ID (for IDOR protection)
 * @returns CachedChatMeta or null if not found/unavailable
 */
export async function getChatMetaFromCache(
    chatId: string,
    userId: string
): Promise<CachedChatMeta | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    return await withCircuitBreaker("getChatMetaFromCache", null, async () => {
        const { metaKey } = getChatKeys(chatId, userId);
        return await redis.get<CachedChatMeta>(metaKey);
    });
}
