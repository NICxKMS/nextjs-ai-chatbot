import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getChatKeys, getMessageScore, getUserChatsScore } from "../keys";
import type { CachedChat, CachedChatMeta, UserChatListItem } from "../types";

/**
 * Set chat in cache (metadata + messages).
 * Replaces any existing chat data atomically.
 *
 * @param chat - Full chat object with messages
 * @returns true if written successfully, false otherwise
 */
export async function setChatInCache(chat: CachedChat): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker("setChatInCache", false, async () => {
        const { metaKey, msgsKey, userChatsKey } = getChatKeys(
            chat.id,
            chat.userId
        );

        // Prepare metadata (without messages)
        const meta: CachedChatMeta = {
            id: chat.id,
            userId: chat.userId,
            title: chat.title,
            visibility: chat.visibility,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            lastContext: chat.lastContext,
            version: chat.version,
        };

        // Prepare user chat list item
        const userChatItem: UserChatListItem = {
            chatId: chat.id,
            title: chat.title,
            updatedAt: getUserChatsScore(chat.updatedAt),
        };

        // Start pipeline for atomic write
        const pipeline = redis.pipeline();

        // Set metadata
        pipeline.set(metaKey, meta);

        // Clear and rebuild messages ZSET
        if (chat.messages.length > 0) {
            pipeline.del(msgsKey);

            // Add messages with scores
            for (const msg of chat.messages) {
                const score = getMessageScore(msg.createdAt, msg.role);
                pipeline.zadd(msgsKey, { score, member: msg });
            }
        }

        // Update user's chat list
        pipeline.zadd(userChatsKey, {
            score: userChatItem.updatedAt,
            member: userChatItem,
        });

        await pipeline.exec();
        return true;
    });
}

/**
 * Update only chat metadata in cache.
 * Does not modify messages.
 *
 * @param meta - Chat metadata to update
 * @returns true if written successfully, false otherwise
 */
export async function setChatMetaInCache(
    meta: CachedChatMeta
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker("setChatMetaInCache", false, async () => {
        const { metaKey, userChatsKey } = getChatKeys(meta.id, meta.userId);

        // Prepare user chat list item
        const userChatItem: UserChatListItem = {
            chatId: meta.id,
            title: meta.title,
            updatedAt: getUserChatsScore(meta.updatedAt),
        };

        const pipeline = redis.pipeline();
        pipeline.set(metaKey, meta);
        pipeline.zadd(userChatsKey, {
            score: userChatItem.updatedAt,
            member: userChatItem,
        });

        await pipeline.exec();
        return true;
    });
}
