/**
 * Message Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing chat messages in Redis ZSET
 * Uses Lua scripts for atomic operations
 *
 * @module lib/cache-ops/messages
 */
import "server-only";

import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { getRedis } from "@/lib/cache/client";
import {
    deserialize,
    getGuestTTL,
    getMessageScore,
    serialize,
} from "@/lib/cache/helpers";
import { CacheKeys } from "@/lib/cache/keys";
import type { CachedMessage } from "@/lib/cache/types";
import { APPEND_MESSAGE_SCRIPT, APPEND_MESSAGES_BULK_SCRIPT } from "./scripts";

/**
 * Serialize a message for Redis storage
 */
function serializeMessage(message: CachedMessage): string {
    return serialize(message);
}

/**
 * Deserialize a message from Redis storage
 */
function deserializeMessage(data: string): CachedMessage | null {
    return deserialize<CachedMessage>(data);
}

/**
 * Append single message to chat cache
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param message - Message to append
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function appendMessageToCache(
    chatId: string,
    userId: string,
    message: CachedMessage,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "appendMessageToCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const msgsKey = CacheKeys.chatMessages(chatId, userId);
            const userChatsKey = CacheKeys.userChats(userId);
            const score = getMessageScore(message.createdAt, message.role);
            const nowISO = new Date().toISOString();
            const ttl = getGuestTTL(isGuest);

            const result = await redis.eval(
                APPEND_MESSAGE_SCRIPT,
                [metaKey, msgsKey, userChatsKey],
                [
                    serializeMessage(message),
                    score.toString(),
                    nowISO,
                    ttl.toString(),
                    chatId,
                ]
            );

            // Script returns message count on success, error on failure
            return typeof result === "number" && result > 0;
        },
        false
    );
}

/**
 * Append multiple messages to chat cache (bulk)
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param messages - Messages to append
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function appendMessagesToCache(
    chatId: string,
    userId: string,
    messages: CachedMessage[],
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "appendMessagesToCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            if (messages.length === 0) {
                return true; // Nothing to append
            }

            const metaKey = CacheKeys.chatMeta(chatId, userId);
            const msgsKey = CacheKeys.chatMessages(chatId, userId);
            const nowISO = new Date().toISOString();
            const ttl = getGuestTTL(isGuest);

            // Serialize messages and compute scores
            const serializedMessages = messages.map(serializeMessage);
            const scores = messages.map((m) =>
                getMessageScore(m.createdAt, m.role)
            );

            const result = await redis.eval(
                APPEND_MESSAGES_BULK_SCRIPT,
                [metaKey, msgsKey],
                [
                    JSON.stringify(serializedMessages),
                    JSON.stringify(scores),
                    nowISO,
                    ttl.toString(),
                ]
            );

            // Script returns message count on success, error on failure
            return typeof result === "number" && result > 0;
        },
        false
    );
}

/**
 * Get messages from cache (newest first or oldest first)
 *
 * Return value semantics:
 * - CachedMessage[]: Cache hit, messages found (may be empty array for empty chat)
 * - null: Cache miss (key doesn't exist) OR cache unavailable
 *
 * Note: null for both miss and unavailable is safe for graceful degradation
 * since both cases should fall through to database lookup.
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param options - Query options
 * @returns Array of messages or null if not in cache/unavailable
 */
export async function getMessagesFromCache(
    chatId: string,
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
        order?: "asc" | "desc";
    }
): Promise<CachedMessage[] | null> {
    return withCircuitBreaker(
        "getMessagesFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const msgsKey = CacheKeys.chatMessages(chatId, userId);
            const offset = options?.offset ?? 0;
            const order = options?.order ?? "asc";
            const limit = options?.limit;

            // Build zrange options
            const zrangeOpts: {
                rev?: boolean;
                offset?: number;
                count?: number;
            } = {};

            if (order === "desc") {
                zrangeOpts.rev = true;
            }

            // Only set offset/count if limit is specified
            if (limit) {
                zrangeOpts.offset = offset;
                zrangeOpts.count = limit;
            }

            // Use zrange with options (Upstash unified API)
            // For unlimited without offset, use simple range 0 to -1
            let rawMessages: string[];

            if (limit) {
                // With limit: use offset/count
                rawMessages = await redis.zrange(
                    msgsKey,
                    0,
                    -1,
                    zrangeOpts as {
                        offset: number;
                        count: number;
                        rev?: boolean;
                    }
                );
            } else if (offset > 0) {
                // With offset but no limit: get from offset to end
                rawMessages = await redis.zrange(
                    msgsKey,
                    offset,
                    -1,
                    order === "desc" ? { rev: true } : undefined
                );
            } else {
                // Simple case: get all
                rawMessages = await redis.zrange(
                    msgsKey,
                    0,
                    -1,
                    order === "desc" ? { rev: true } : undefined
                );
            }

            // Check if key exists (empty array could mean no messages OR no key)
            if (rawMessages.length === 0) {
                const exists = await redis.exists(msgsKey);
                if (!exists) {
                    return null; // Cache miss
                }
                return []; // Empty chat
            }

            // Deserialize messages
            const messages: CachedMessage[] = [];
            for (const raw of rawMessages) {
                const msg = deserializeMessage(raw);
                if (msg) {
                    messages.push(msg);
                }
            }

            return messages;
        },
        null
    );
}

/**
 * Get messages after a specific timestamp (for pagination)
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param afterTimestamp - Unix timestamp (ms) to get messages after
 * @param limit - Maximum number of messages to return
 * @returns Array of messages or null if not in cache
 */
export async function getMessagesAfterTimestamp(
    chatId: string,
    userId: string,
    afterTimestamp: number,
    limit?: number
): Promise<CachedMessage[] | null> {
    return withCircuitBreaker(
        "getMessagesAfterTimestamp",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const msgsKey = CacheKeys.chatMessages(chatId, userId);

            // Use exclusive min score (afterTimestamp + small offset)
            // Score format is timestamp + role offset, so we add small value
            // Use parenthesis notation for exclusive range: "(score"
            const minScore = `(${afterTimestamp}` as const;

            // ZRANGE with byScore option for score-based range
            let rawMessages: string[];
            if (limit) {
                rawMessages = await redis.zrange(msgsKey, minScore, "+inf", {
                    byScore: true,
                    offset: 0,
                    count: limit,
                });
            } else {
                rawMessages = await redis.zrange(msgsKey, minScore, "+inf", {
                    byScore: true,
                });
            }

            // Check if key exists
            if (rawMessages.length === 0) {
                const exists = await redis.exists(msgsKey);
                if (!exists) {
                    return null; // Cache miss
                }
                return []; // No messages after timestamp
            }

            // Deserialize messages
            const messages: CachedMessage[] = [];
            for (const raw of rawMessages) {
                const msg = deserializeMessage(raw);
                if (msg) {
                    messages.push(msg);
                }
            }

            return messages;
        },
        null
    );
}

/**
 * Delete messages after a fork point (for regeneration)
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @param afterTimestamp - Unix timestamp (ms) to delete messages after
 * @returns Count of deleted messages, or 0 on error
 */
export async function deleteMessagesAfterTimestamp(
    chatId: string,
    userId: string,
    afterTimestamp: number
): Promise<number> {
    return withCircuitBreaker(
        "deleteMessagesAfterTimestamp",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return 0;
            }

            const msgsKey = CacheKeys.chatMessages(chatId, userId);

            // Use exclusive min score
            const minScore = afterTimestamp + 0.001;

            // ZREMRANGEBYSCORE returns count of removed elements
            const removed = await redis.zremrangebyscore(
                msgsKey,
                minScore,
                "+inf"
            );

            return removed;
        },
        0
    );
}

/**
 * Get message count in chat
 *
 * @param chatId - Chat identifier
 * @param userId - User identifier
 * @returns Message count or null if not in cache
 */
export async function getMessageCount(
    chatId: string,
    userId: string
): Promise<number | null> {
    return withCircuitBreaker(
        "getMessageCount",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const msgsKey = CacheKeys.chatMessages(chatId, userId);

            // Check if key exists first
            const exists = await redis.exists(msgsKey);
            if (!exists) {
                return null; // Cache miss
            }

            // ZCARD returns count of elements in sorted set
            const count = await redis.zcard(msgsKey);

            return count;
        },
        null
    );
}
