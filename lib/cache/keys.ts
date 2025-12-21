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

    /**
     * Document metadata key
     * Format: doc:{userId}:{documentId}:meta
     */
    documentMeta: (userId: string, documentId: string) =>
        `doc:${userId}:${documentId}:meta`,

    /**
     * Document versions ZSET key
     * Format: doc:{userId}:{documentId}:versions
     */
    documentVersions: (userId: string, documentId: string) =>
        `doc:${userId}:${documentId}:versions`,

    /**
     * User's documents list key
     * Format: user:{userId}:docs
     */
    userDocuments: (userId: string) => `user:${userId}:docs`,

    /**
     * Daily quota key (alias with explicit naming)
     * Format: quota:{userId}:{date}
     */
    quotaDaily: (userId: string, date: string) => `quota:${userId}:${date}`,

    /**
     * Hourly quota key
     * Format: quota:{userId}:hour:{dateHour}
     */
    quotaHourly: (userId: string, dateHour: string) =>
        `quota:${userId}:hour:${dateHour}`,

    /**
     * Typing indicators ZSET key
     * Format: typing:{chatId}
     */
    typingZset: (chatId: string) => `typing:${chatId}`,

    /**
     * User online status key
     * Format: online:{userId}
     */
    online: (userId: string) => `online:${userId}`,

    /**
     * Chat active users key
     * Format: chat:{chatId}:active
     */
    chatActiveUsers: (chatId: string) => `chat:${chatId}:active`,

    /**
     * User session key
     * Format: session:{userId}
     *
     * Design Decision: Uses userId (not sessionId) because our system
     * enforces one active session per user. New logins invalidate previous
     * sessions. This simplifies cache invalidation and prevents orphaned
     * session data.
     *
     * @see lib/auth/session.ts for session management
     */
    session: (userId: string) => `session:${userId}`,
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
