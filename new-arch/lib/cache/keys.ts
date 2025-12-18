import "server-only";

/**
 * Cache key patterns and builders.
 *
 * Naming Convention: {entity}:{id}:{userId}:{subtype}
 *
 * The userId is included in chat/document keys for:
 * - IDOR protection (users can only access their own data)
 * - Namespace isolation
 * - Simplified access control at cache level
 */

// -----------------------------------------------------------------------------
// Key Builders
// -----------------------------------------------------------------------------

export const CacheKeys = {
    /**
     * Chat-related keys
     */
    chat: {
        /** Chat metadata (STRING) - chat:{chatId}:{userId}:meta */
        meta: (chatId: string, userId: string) =>
            `chat:${chatId}:${userId}:meta` as const,

        /** Chat messages (ZSET) - chat:{chatId}:{userId}:msgs */
        messages: (chatId: string, userId: string) =>
            `chat:${chatId}:${userId}:msgs` as const,
    },

    /**
     * User-related keys
     */
    user: {
        /** User's chat list (ZSET) - user:{userId}:chats */
        chats: (userId: string) => `user:${userId}:chats` as const,

        /** User's daily quota (STRING) - quota:{userId}:{date} */
        quota: (userId: string, date: string) =>
            `quota:${userId}:${date}` as const,
    },

    /**
     * Document-related keys
     */
    document: {
        /** Document with versions (STRING) - document:{documentId}:{userId} */
        byId: (documentId: string, userId: string) =>
            `document:${documentId}:${userId}` as const,
    },
} as const;

// -----------------------------------------------------------------------------
// Type-Safe Key Helpers
// -----------------------------------------------------------------------------

/**
 * All keys needed for chat operations.
 */
export type ChatCacheKeys = {
    metaKey: string;
    msgsKey: string;
    userChatsKey: string;
};

/**
 * Get all cache keys for a chat.
 * Centralizes key generation to ensure consistency.
 */
export function getChatKeys(chatId: string, userId: string): ChatCacheKeys {
    return {
        metaKey: CacheKeys.chat.meta(chatId, userId),
        msgsKey: CacheKeys.chat.messages(chatId, userId),
        userChatsKey: CacheKeys.user.chats(userId),
    };
}

/**
 * All keys needed for document operations.
 */
export type DocumentCacheKeys = {
    documentKey: string;
};

/**
 * Get cache key for a document.
 */
export function getDocumentKeys(
    documentId: string,
    userId: string
): DocumentCacheKeys {
    return {
        documentKey: CacheKeys.document.byId(documentId, userId),
    };
}

// -----------------------------------------------------------------------------
// Key Pattern Matchers (for admin/cleanup operations)
// -----------------------------------------------------------------------------

/**
 * Pattern to match all chat keys for a user.
 * Use with SCAN for cleanup operations.
 */
export function getChatPattern(userId: string): string {
    return `chat:*:${userId}:*`;
}

/**
 * Pattern to match all document keys for a user.
 */
export function getDocumentPattern(userId: string): string {
    return `document:*:${userId}`;
}

// -----------------------------------------------------------------------------
// Score Calculation Utilities
// -----------------------------------------------------------------------------

/**
 * Role offset for ZSET scores.
 * Ensures messages with same timestamp are ordered: user → assistant → system
 */
const ROLE_OFFSET: Record<string, number> = {
    user: 0,
    assistant: 1,
    system: 2,
};

/**
 * Calculate ZSET score for a message.
 * Score = timestamp + role offset (0.0, 0.1, 0.2)
 *
 * @param timestamp - Message creation time (Date or ISO string)
 * @param role - Message role
 * @returns Score for ZADD
 */
export function getMessageScore(
    timestamp: Date | string,
    role: "user" | "assistant" | "system"
): number {
    const time =
        typeof timestamp === "string"
            ? new Date(timestamp).getTime()
            : timestamp.getTime();
    return time + (ROLE_OFFSET[role] ?? 0) * 0.1;
}

/**
 * Calculate ZSET score for user chat list.
 * Score = updatedAt timestamp in ms
 */
export function getUserChatsScore(updatedAt: Date | string): number {
    return typeof updatedAt === "string"
        ? new Date(updatedAt).getTime()
        : updatedAt.getTime();
}
