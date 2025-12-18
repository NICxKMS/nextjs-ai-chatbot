import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { CacheKeys, getChatKeys } from "../keys";
import type { UserChatListItem } from "../types";

/**
 * Delete chat from cache (metadata + messages + user list entry).
 *
 * @param chatId - Chat ID to delete
 * @param userId - User ID (for IDOR protection)
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteChatFromCache(
    chatId: string,
    userId: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker("deleteChatFromCache", false, async () => {
        const { metaKey, msgsKey, userChatsKey } = getChatKeys(chatId, userId);

        const pipeline = redis.pipeline();

        // Delete chat metadata
        pipeline.del(metaKey);

        // Delete chat messages
        pipeline.del(msgsKey);

        // Remove from user's chat list
        // We need to find and remove the item by chatId
        // First get all items to find the one to remove
        const items = await redis.zrange<UserChatListItem[]>(
            userChatsKey,
            0,
            -1
        );
        const itemToRemove = items?.find((item) => item.chatId === chatId);

        if (itemToRemove) {
            pipeline.zrem(userChatsKey, itemToRemove);
        }

        await pipeline.exec();
        return true;
    });
}

/**
 * Delete multiple chats from cache atomically.
 *
 * @param chatIds - Array of chat IDs to delete
 * @param userId - User ID (for IDOR protection)
 * @returns Number of chats deleted
 */
export async function deleteChatsFromCache(
    chatIds: string[],
    userId: string
): Promise<number> {
    const redis = getRedisClient();
    if (!redis || chatIds.length === 0) {
        return 0;
    }

    return await withCircuitBreaker("deleteChatsFromCache", 0, async () => {
        const userChatsKey = CacheKeys.user.chats(userId);

        // Get all items to find ones to remove
        const items = await redis.zrange<UserChatListItem[]>(
            userChatsKey,
            0,
            -1
        );
        const chatIdSet = new Set(chatIds);
        const itemsToRemove =
            items?.filter((item) => chatIdSet.has(item.chatId)) ?? [];

        const pipeline = redis.pipeline();

        // Delete each chat's metadata and messages
        for (const chatId of chatIds) {
            const { metaKey, msgsKey } = getChatKeys(chatId, userId);
            pipeline.del(metaKey);
            pipeline.del(msgsKey);
        }

        // Remove from user's chat list
        for (const item of itemsToRemove) {
            pipeline.zrem(userChatsKey, item);
        }

        await pipeline.exec();
        return chatIds.length;
    });
}
