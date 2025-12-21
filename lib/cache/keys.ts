/**
 * Cache Key Patterns
 * Ref: 04-cache-layer-optimal-design.md §5
 *
 * Consistent key naming for all cache operations
 */

/**
 * Cache key generators
 */
export const CacheKeys = {
    /**
     * Chat metadata key
     * Format: chat:{chatId}:{userId}:meta
     */
    chatMeta: (chatId: string, userId: string) =>
        `chat:${chatId}:${userId}:meta`,

    /**
     * Chat messages ZSET key
     * Format: chat:{chatId}:{userId}:msgs
     */
    chatMessages: (chatId: string, userId: string) =>
        `chat:${chatId}:${userId}:msgs`,

    /**
     * User's chat list ZSET key
     * Format: user:{userId}:chats
     */
    userChats: (userId: string) => `user:${userId}:chats`,

    /**
     * Document cache key
     * Format: document:{documentId}:{userId}
     */
    document: (documentId: string, userId: string) =>
        `document:${documentId}:${userId}`,

    /**
     * Daily quota key
     * Format: quota:{userId}:YYYY-MM-DD
     */
    quota: (userId: string, date: string) => `quota:${userId}:${date}`,
} as const;

/**
 * Get all cache keys for a chat
 */
export function getChatCacheKeys(chatId: string, userId: string) {
    return {
        metaKey: CacheKeys.chatMeta(chatId, userId),
        msgsKey: CacheKeys.chatMessages(chatId, userId),
        userChatsKey: CacheKeys.userChats(userId),
    };
}

/**
 * Parse entity ID from cache key
 */
export function parseKeyId(key: string, prefix: string): string | null {
    if (!key.startsWith(prefix)) {
        return null;
    }
    const parts = key.slice(prefix.length).split(":");
    return parts[0] || null;
}
