/**
 * Chat Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing chat metadata and user chat lists in Redis
 * Uses Lua scripts for atomic operations
 *
 * @module lib/cache-ops/chat
 */
import "server-only";

import { getRedis } from "@/lib/cache/client";
import { CacheKeys } from "@/lib/cache/keys";
import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { serialize, deserialize, getGuestTTL } from "@/lib/cache/helpers";
import type { CachedChatMeta } from "@/lib/cache/types";
import {
    CREATE_CHAT_SCRIPT,
    UPDATE_METADATA_SCRIPT,
    DELETE_CHAT_SCRIPT,
    DELETE_ALL_USER_CHATS_SCRIPT,
    FORK_CHAT_SCRIPT,
} from "./scripts";

/**
 * Serialize chat metadata for Redis storage
 */
function serializeChat(chat: CachedChatMeta): string {
    return serialize(chat);
}

/**
 * Deserialize chat metadata from Redis storage
 */
function deserializeChat(data: string | null): CachedChatMeta | null {
    return deserialize<CachedChatMeta>(data);
}

/**
 * Create new chat in cache
 *
 * @param chat - Chat metadata to store
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function createChatInCache(
    chat: CachedChatMeta,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "createChatInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.chatMeta(chat.id, chat.userId);
            const userChatsKey = CacheKeys.userChats(chat.userId);
            const score = chat.updatedAt;
            const ttl = getGuestTTL(isGuest);

            const result = await redis.eval(
                CREATE_CHAT_SCRIPT,
                [metaKey, userChatsKey],
                [serializeChat(chat), score.toString(), ttl.toString()]
            );

            return result === "OK";
        },
        false
    );
}

/**
 * Get chat metadata from cache
 *
 * Return value semantics:
 * - CachedChatMeta: Cache hit, data found
 * - null: Cache miss (key doesn't exist) OR cache unavailable
 *
 * Note: null for both miss and unavailable is safe for graceful degradation
 * since both cases should fall through to database lookup.
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @returns Chat metadata or null if not in cache/unavailable
 */
export async function getChatFromCache(
    chatId: string,
    userId: string
): Promise<CachedChatMeta | null> {
    return withCircuitBreaker(
        "getChatFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const data = await redis.get<string>(metaKey);

            return deserializeChat(data);
        },
        null
    );
}

/**
 * Update chat metadata (title, visibility, etc.)
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param updates - Partial updates to apply
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns Updated chat metadata or null if not found
 */
export async function updateChatInCache(
    chatId: string,
    userId: string,
    updates: Partial<CachedChatMeta>,
    isGuest: boolean = false
): Promise<CachedChatMeta | null> {
    return withCircuitBreaker(
        "updateChatInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const nowISO = new Date().toISOString();
            const ttl = getGuestTTL(isGuest);

            try {
                const result = await redis.eval(
                    UPDATE_METADATA_SCRIPT,
                    [metaKey],
                    [serialize(updates), nowISO, ttl.toString()]
                );

                // Result could be string (raw) or object (Upstash auto-parsed)
                if (result) {
                    return deserializeChat(result as string);
                }
                return null;
            } catch {
                // Script returns error if chat not found
                return null;
            }
        },
        null
    );
}

/**
 * Delete chat from cache (cascade: meta + messages + remove from list)
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @returns true if deleted, false otherwise
 */
export async function deleteChatFromCache(
    chatId: string,
    userId: string
): Promise<boolean> {
    return withCircuitBreaker(
        "deleteChatFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const msgsKey = CacheKeys.chatMessages(chatId, userId);
            const userChatsKey = CacheKeys.userChats(userId);

            const result = await redis.eval(
                DELETE_CHAT_SCRIPT,
                [metaKey, msgsKey, userChatsKey],
                [chatId]
            );

            return typeof result === "number" && result > 0;
        },
        false
    );
}

/**
 * Delete all user's chats from cache
 *
 * @param userId - User identifier
 * @returns Number of chats deleted
 */
export async function deleteAllUserChatsFromCache(
    userId: string
): Promise<number> {
    return withCircuitBreaker(
        "deleteAllUserChatsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return 0;
            }

            const userChatsKey = CacheKeys.userChats(userId);
            // Key prefix for building chat keys: chat:{chatId}:{userId}:meta/msgs
            const keyPrefix = `chat:`;

            const result = await redis.eval(
                DELETE_ALL_USER_CHATS_SCRIPT,
                [userChatsKey],
                [keyPrefix, userId]
            );

            return typeof result === "number" ? result : 0;
        },
        0
    );
}

/**
 * Upstash zrange with withScores returns array of objects
 */
interface ZRangeWithScoreResult {
    value: string;
    score: number;
}

/**
 * Get user's chat list (paginated, sorted by updatedAt desc)
 *
 * @param userId - User identifier
 * @param options - Pagination options
 * @returns Array of chat IDs with timestamps, or null if not in cache
 */
export async function getUserChatsFromCache(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
    }
): Promise<{ chatId: string; updatedAt: number }[] | null> {
    return withCircuitBreaker(
        "getUserChatsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const userChatsKey = CacheKeys.userChats(userId);
            const limit = options?.limit ?? 50;
            const offset = options?.offset ?? 0;

            // ZREVRANGE returns newest first (highest scores first)
            // Use ZRANGE with REV option for reverse ordering with scores
            // Upstash returns array of { value, score } objects when withScores: true
            const results = await redis.zrange<ZRangeWithScoreResult[]>(
                userChatsKey,
                offset,
                offset + limit - 1,
                { rev: true, withScores: true }
            );

            if (!results || results.length === 0) {
                return null;
            }

            // Upstash withScores returns [{ value: string, score: number }, ...]
            return results.map((item) => ({
                chatId: item.value,
                updatedAt: item.score,
            }));
        },
        null
    );
}

/**
 * Fork chat (branch conversation)
 * Copies messages from source chat up to specified timestamp
 *
 * @param sourceChatId - Source chat identifier
 * @param sourceUserId - Source user identifier
 * @param newChat - New chat metadata
 * @param untilTimestamp - Copy messages up to this timestamp
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function forkChatInCache(
    sourceChatId: string,
    sourceUserId: string,
    newChat: CachedChatMeta,
    untilTimestamp: number,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "forkChatInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const srcMetaKey = CacheKeys.chatMeta(sourceChatId, sourceUserId);
            const srcMsgsKey = CacheKeys.chatMessages(sourceChatId, sourceUserId);
            const dstMetaKey = CacheKeys.chatMeta(newChat.id, newChat.userId);
            const dstMsgsKey = CacheKeys.chatMessages(newChat.id, newChat.userId);
            const ttl = getGuestTTL(isGuest);

            try {
                const result = await redis.eval(
                    FORK_CHAT_SCRIPT,
                    [srcMetaKey, srcMsgsKey, dstMetaKey, dstMsgsKey],
                    [serializeChat(newChat), untilTimestamp.toString(), ttl.toString()]
                );

                // Script returns number of messages copied (0 is valid)
                return typeof result === "number";
            } catch {
                // Script returns error if source chat not found
                return false;
            }
        },
        false
    );
}

/**
 * Check if chat exists in cache
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @returns true if chat exists, false otherwise
 */
export async function chatExistsInCache(
    chatId: string,
    userId: string
): Promise<boolean> {
    return withCircuitBreaker(
        "chatExistsInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const exists = await redis.exists(metaKey);

            return exists === 1;
        },
        false
    );
}
