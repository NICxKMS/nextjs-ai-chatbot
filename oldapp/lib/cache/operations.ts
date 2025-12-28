import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { GUEST_CACHE_TTL_SECONDS } from "@/lib/constants";
import { logError, logWarn } from "@/lib/log";
import type { Chat, DBMessage, Document } from "../db/schema";
import type { AppUsage } from "../usage";
import {
    dbMessageToCachedMessage,
    getChatCacheKeys,
    getMessageScore,
    isGuestUserId,
    parseMessagesFromRaw,
} from "./helpers";
import { getRedisClient, isRedisAvailable } from "./redis";
import {
    type CachedChat,
    type CachedChatMeta,
    type CachedDocument,
    type CachedMessage,
    CacheKeys,
    type DocumentVersion,
} from "./types";

/**
 * =============================================================================
 * CIRCUIT BREAKER FOR REDIS OPERATIONS
 * =============================================================================
 *
 * FIX Issue 3.1: Implement circuit breaker to prevent silent cache failures
 * from masking Redis connection issues.
 *
 * When consecutive failures exceed threshold, circuit opens and cache
 * operations are skipped until reset timeout passes.
 */
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000; // 30 seconds
let circuitOpenedAt: number | null = null;

/**
 * Check if circuit breaker is open (cache operations should be skipped)
 */
function isCircuitOpen(): boolean {
    if (!circuitOpenedAt) {
        return false;
    }
    if (Date.now() - circuitOpenedAt > CIRCUIT_BREAKER_RESET_MS) {
        // Reset circuit breaker after timeout
        circuitOpenedAt = null;
        consecutiveFailures = 0;
        logWarn("Redis circuit breaker reset - retrying cache operations");
        return false;
    }
    return true;
}

/**
 * Record a cache operation failure
 * Opens circuit breaker after threshold is reached
 */
function recordCacheFailure(operation: string, error: unknown): void {
    consecutiveFailures++;
    logError(
        `Redis ${operation} error (failure ${consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD})`,
        error
    );

    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpenedAt) {
        circuitOpenedAt = Date.now();
        logError(
            "Redis circuit breaker OPENED - cache operations will be skipped",
            {
                consecutiveFailures,
                resetAfterMs: CIRCUIT_BREAKER_RESET_MS,
            }
        );
    }
}

/**
 * Record a successful cache operation
 * Resets consecutive failure count
 */
function recordCacheSuccess(): void {
    if (consecutiveFailures > 0) {
        consecutiveFailures = 0;
    }
}

/**
 * =============================================================================
 * REDIS SORTED SET (ZSET) CACHE OPERATIONS
 * =============================================================================
 *
 * Performance characteristics:
 * - Message append: O(log N) via ZADD
 * - Get all messages: O(N) via ZRANGE
 * - Get last N messages: O(log N + M) via ZRANGE with LIMIT
 * - Delete after timestamp: O(log N + M) via ZREMRANGEBYSCORE (non-blocking!)
 * - Update metadata: O(1) via SET
 *
 * Key structure:
 * - chat:{chatId}:{userId}:meta → JSON string (CachedChatMeta)
 * - chat:{chatId}:{userId}:msgs → Sorted Set (score=timestamp, member=JSON)
 */

/**
 * =============================================================================
 * HELPER FUNCTIONS
 * =============================================================================
 */

/**
 * Apply TTL for guest users on multiple keys via pipeline
 * Centralizes the repetitive TTL application pattern
 */
function applyGuestTTL(
    pipeline: ReturnType<import("@upstash/redis").Redis["pipeline"]>,
    keys: string[],
    userId: string
): void {
    if (isGuestUserId(userId)) {
        for (const key of keys) {
            pipeline.expire(key, GUEST_CACHE_TTL_SECONDS);
        }
    }
}

/**
 * =============================================================================
 * CHAT OPERATIONS
 * =============================================================================
 */

/**
 * Get chat from cache (assembles metadata + messages)
 * Returns full CachedChat for backward compatibility
 *
 * NOTE: This loads ALL messages into memory. For conversations with 1000+ messages,
 * consider using getLastMessagesFromCache() with pagination instead.
 */
export async function getChatFromCache(
    chatId: string,
    userId: string,
    opts?: { maxMessages?: number }
): Promise<CachedChat | null> {
    // FIX Issue 3.1: Check circuit breaker before attempting cache operation
    if (isCircuitOpen()) {
        return null;
    }

    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    try {
        const { metaKey, msgsKey } = getChatCacheKeys(
            chatId,
            userId,
            CacheKeys
        );

        // Fetch metadata and messages in parallel
        // ZRANGE returns all members sorted by score (timestamp) ascending
        // If maxMessages is specified, only fetch the last N messages for performance
        const [meta, messagesRaw] = await Promise.all([
            redis.get<CachedChatMeta>(metaKey),
            opts?.maxMessages
                ? redis.zrange(msgsKey, -opts.maxMessages, -1)
                : redis.zrange(msgsKey, 0, -1),
        ]);

        if (!meta) {
            recordCacheSuccess();
            return null;
        }

        // Parse messages using centralized helper
        const messages = parseMessagesFromRaw(messagesRaw);

        recordCacheSuccess();
        return {
            ...meta,
            messages,
        };
    } catch (error) {
        recordCacheFailure("getChatFromCache", error);
        return null;
    }
}

/**
 * Get chat metadata only (without messages) - faster for list views
 */
export async function getChatMetaFromCache(
    chatId: string,
    userId: string
): Promise<CachedChatMeta | null> {
    if (isCircuitOpen()) {
        return null;
    }

    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    try {
        const metaKey = CacheKeys.chatMeta(chatId, userId);
        if (!metaKey) {
            return null;
        }
        const result = await redis.get<CachedChatMeta>(metaKey);
        recordCacheSuccess();
        return result;
    } catch (error) {
        recordCacheFailure("getChatMetaFromCache", error);
        return null;
    }
}

/**
 * Get only the last N messages (efficient for chat preview)
 * Uses ZRANGE with REV to get newest messages first, then reverses
 */
export async function getLastMessagesFromCache(
    chatId: string,
    userId: string,
    count: number
): Promise<CachedMessage[]> {
    if (isCircuitOpen()) {
        return [];
    }

    const redis = getRedisClient();
    if (!redis) {
        return [];
    }

    try {
        const { msgsKey } = getChatCacheKeys(chatId, userId, CacheKeys);
        // Get last N messages (highest scores = newest)
        const messagesRaw = await redis.zrange(msgsKey, -count, -1);

        recordCacheSuccess();
        return parseMessagesFromRaw(messagesRaw);
    } catch (error) {
        recordCacheFailure("getLastMessagesFromCache", error);
        return [];
    }
}

/**
 * Set chat in cache (metadata + messages)
 * Uses ZSET for messages with timestamp scores
 */
export async function setChatInCache(
    chatId: string,
    userId: string,
    chat: CachedChat
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const { metaKey, msgsKey, userChatsKey } = getChatCacheKeys(
            chatId,
            userId,
            CacheKeys
        );

        // Extract metadata (without messages)
        const { messages, ...meta } = chat;

        // Use pipeline for atomic operations
        const pipeline = redis.pipeline();

        // Set metadata
        pipeline.set(metaKey, meta);

        // Clear existing messages and set new ones using ZSET
        if (messages.length > 0) {
            pipeline.del(msgsKey);
            // ZADD with score=timestamp for each message
            for (const msg of messages) {
                const score = getMessageScore(msg);
                pipeline.zadd(msgsKey, { score, member: JSON.stringify(msg) });
            }
        }

        // Update user chats ZSET
        pipeline.zadd(userChatsKey, {
            score: Date.parse(chat.updatedAt),
            member: chatId,
        });

        // Apply TTL for guest users
        applyGuestTTL(pipeline, [metaKey, msgsKey, userChatsKey], userId);

        await pipeline.exec();
    } catch (error) {
        logError("Redis setChatInCache error", error);
    }
}

/**
 * Lua script for atomic message append with existence check
 * Uses ZADD with timestamp score for O(log N) insert
 * Includes TTL application for guest users (eliminates separate EXPIRE round-trip)
 * Returns 1 if successful, 0 if chat doesn't exist
 */
const APPEND_MESSAGE_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]
local messageStr = ARGV[1]
local now = ARGV[2]
local userChatsScore = tonumber(ARGV[3])
local chatId = ARGV[4]
local msgScore = tonumber(ARGV[5])
local ttl = tonumber(ARGV[6])

-- Check if chat exists
local meta = redis.call('GET', metaKey)
if not meta then
	return 0
end

-- Add message to ZSET with timestamp score
redis.call('ZADD', msgsKey, msgScore, messageStr)

-- Update metadata
local data = cjson.decode(meta)
data.updatedAt = now
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

-- Update user chats ZSET
redis.call('ZADD', userChatsKey, userChatsScore, chatId)

-- Apply TTL for guest users (ttl > 0 means guest)
if ttl > 0 then
	redis.call('EXPIRE', metaKey, ttl)
	redis.call('EXPIRE', msgsKey, ttl)
	redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * Append new message to cached chat - O(log N) operation
 * Uses ZADD with timestamp score for efficient range operations
 * @param opts.skipExistenceCheck - Skip metadata check when caller confirms chat exists
 */
export async function appendMessageToCache(
    chatId: string,
    userId: string,
    message: CachedMessage,
    opts?: { skipExistenceCheck?: boolean }
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const { metaKey, msgsKey, userChatsKey } = getChatCacheKeys(
            chatId,
            userId,
            CacheKeys
        );
        const now = new Date().toISOString();
        const isGuest = isGuestUserId(userId);
        const msgScore = getMessageScore(message);

        if (opts?.skipExistenceCheck) {
            // Use pipeline directly when caller confirms chat exists
            const pipeline = redis.pipeline();

            // Add message to ZSET with timestamp score
            pipeline.zadd(msgsKey, {
                score: msgScore,
                member: JSON.stringify(message),
            });

            // Update user chats ZSET
            pipeline.zadd(userChatsKey, {
                score: Date.now(),
                member: chatId,
            });

            // Apply TTL for guest users
            applyGuestTTL(pipeline, [msgsKey, userChatsKey], userId);

            await pipeline.exec();
            return;
        }

        // Use Lua script for atomic operation (single round-trip!)
        await redis.eval(
            APPEND_MESSAGE_SCRIPT,
            [metaKey, msgsKey, userChatsKey],
            [
                JSON.stringify(message),
                now,
                Date.now().toString(),
                chatId,
                msgScore.toString(),
                isGuest ? GUEST_CACHE_TTL_SECONDS.toString() : "0",
            ]
        );
    } catch (error) {
        logError("Redis appendMessageToCache error", error);
    }
}

/**
 * Lua script for atomic bulk message append with existence check
 * Uses ZADD for each message with its timestamp score
 * Includes TTL application for guest users (eliminates separate EXPIRE round-trip)
 * Returns 1 if successful, 0 if chat doesn't exist
 */
const APPEND_MESSAGES_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]
local now = ARGV[1]
local userChatsScore = tonumber(ARGV[2])
local chatId = ARGV[3]
local msgCount = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

-- Check if chat exists
local meta = redis.call('GET', metaKey)
if not meta then
	return 0
end

-- Add messages to ZSET (ARGV[6] onwards: score1, msg1, score2, msg2, ...)
for i = 6, 6 + (msgCount * 2) - 1, 2 do
	local msgScore = tonumber(ARGV[i])
	local msgStr = ARGV[i + 1]
	if msgScore and msgStr then
		redis.call('ZADD', msgsKey, msgScore, msgStr)
	end
end

-- Update metadata
local data = cjson.decode(meta)
data.updatedAt = now
data.version = (data.version or 0) + 1
redis.call('SET', metaKey, cjson.encode(data))

-- Update user chats ZSET
redis.call('ZADD', userChatsKey, userChatsScore, chatId)

-- Apply TTL for guest users (ttl > 0 means guest)
if ttl > 0 then
	redis.call('EXPIRE', metaKey, ttl)
	redis.call('EXPIRE', msgsKey, ttl)
	redis.call('EXPIRE', userChatsKey, ttl)
end

return 1
`;

/**
 * Bulk append multiple messages to cached chat - O(M log N) where M = new messages
 * Uses ZADD with timestamp scores for efficient range operations
 * @param opts.skipExistenceCheck - Skip metadata check when caller confirms chat exists
 */
export async function appendMessagesToCache(
    chatId: string,
    userId: string,
    messages: CachedMessage[],
    opts?: { skipExistenceCheck?: boolean }
): Promise<void> {
    const redis = getRedisClient();
    if (!redis || messages.length === 0) {
        return;
    }

    try {
        const { metaKey, msgsKey, userChatsKey } = getChatCacheKeys(
            chatId,
            userId,
            CacheKeys
        );
        const now = new Date().toISOString();
        const isGuest = isGuestUserId(userId);

        if (opts?.skipExistenceCheck) {
            // Use pipeline directly when caller confirms chat exists
            const pipeline = redis.pipeline();

            // Add all messages to ZSET with timestamp scores
            for (const msg of messages) {
                const score = getMessageScore(msg);
                pipeline.zadd(msgsKey, { score, member: JSON.stringify(msg) });
            }

            // Update user chats ZSET
            pipeline.zadd(userChatsKey, {
                score: Date.now(),
                member: chatId,
            });

            // Apply TTL for guest users
            applyGuestTTL(pipeline, [msgsKey, userChatsKey], userId);

            await pipeline.exec();
            return;
        }

        // Prepare score-message pairs for Lua script
        const scoreMessagePairs: string[] = [];
        for (const msg of messages) {
            scoreMessagePairs.push(getMessageScore(msg).toString());
            scoreMessagePairs.push(JSON.stringify(msg));
        }

        // Use Lua script for atomic operation (single round-trip!)
        await redis.eval(
            APPEND_MESSAGES_SCRIPT,
            [metaKey, msgsKey, userChatsKey],
            [
                now,
                Date.now().toString(),
                chatId,
                messages.length.toString(),
                isGuest ? GUEST_CACHE_TTL_SECONDS.toString() : "0",
                ...scoreMessagePairs,
            ]
        );
    } catch (error) {
        logError("Redis appendMessagesToCache error", error);
    }
}

/**
 * Delete messages from cache at or after timestamp
 * Uses ZREMRANGEBYSCORE for O(log N + M) deletion - no iteration needed!
 * This is the key advantage of ZSET over List for message storage.
 */
export async function deleteMessagesFromCacheAfterTimestamp(
    chatId: string,
    userId: string,
    timestamp: Date
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const { msgsKey } = getChatCacheKeys(chatId, userId, CacheKeys);
        const timestampMs = timestamp.getTime();

        // Use pipeline for atomic delete + metadata update
        // ZREMRANGEBYSCORE is O(log N + M) where M = deleted messages
        // No Lua iteration required!
        const pipeline = redis.pipeline();

        // Remove all messages with score >= timestamp (at or after)
        // Use a very large number for max to represent +inf
        pipeline.zremrangebyscore(
            msgsKey,
            timestampMs,
            Number.MAX_SAFE_INTEGER
        );

        await pipeline.exec();

        // Update metadata version (separate call, but metadata update is fast)
        await updateChatMetadataAtomically(chatId, userId, {});
    } catch (error) {
        logError("Redis deleteMessagesFromCacheAfterTimestamp error", error);
    }
}

/**
 * Generic metadata update using Lua script for atomic GET-modify-SET
 * Reduces 2 round-trips to 1 atomic operation
 */
const UPDATE_META_SCRIPT = `
local meta = redis.call('GET', KEYS[1])
if not meta then
	return nil
end
local data = cjson.decode(meta)
local updates = cjson.decode(ARGV[1])
for k, v in pairs(updates) do
	data[k] = v
end
data.updatedAt = ARGV[2]
data.version = (data.version or 0) + 1
redis.call('SET', KEYS[1], cjson.encode(data))
return cjson.encode(data)
`;

/**
 * Update chat metadata atomically - single round-trip
 * @param chatId Chat UUID
 * @param userId User ID
 * @param updates Partial metadata updates
 */
async function updateChatMetadataAtomically(
    chatId: string,
    userId: string,
    updates: Partial<
        Pick<CachedChatMeta, "title" | "visibility" | "lastContext">
    >
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const { metaKey } = getChatCacheKeys(chatId, userId, CacheKeys);
        const now = new Date().toISOString();

        await redis.eval(
            UPDATE_META_SCRIPT,
            [metaKey],
            [JSON.stringify(updates), now]
        );
    } catch (error) {
        logError("Redis updateChatMetadataAtomically error", error);
    }
}

/**
 * Update chat title in cache - O(1) atomic operation
 */
export function updateChatTitleInCache(
    chatId: string,
    userId: string,
    title: string
): Promise<void> {
    return updateChatMetadataAtomically(chatId, userId, { title });
}

/**
 * Update chat last context in cache - O(1) atomic operation
 */
export function updateChatLastContextInCache(
    chatId: string,
    userId: string,
    context: AppUsage
): Promise<void> {
    return updateChatMetadataAtomically(chatId, userId, {
        lastContext: context,
    });
}

/**
 * Update chat visibility in cache - O(1) atomic operation
 */
export function updateChatVisibilityInCache(
    chatId: string,
    userId: string,
    visibility: VisibilityType
): Promise<void> {
    return updateChatMetadataAtomically(chatId, userId, { visibility });
}

/**
 * Delete chat from cache with retry logic
 * FIX Issue 1.2: Add retry with exponential backoff to handle transient failures
 *
 * @param chatId Chat UUID
 * @param userId User ID
 * @param maxRetries Maximum retry attempts (default 3)
 */
export async function deleteChatFromCache(
    chatId: string,
    userId: string,
    maxRetries = 3
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    const { metaKey, msgsKey, userChatsKey } = getChatCacheKeys(
        chatId,
        userId,
        CacheKeys
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Delete all keys atomically
            const pipeline = redis.pipeline();
            pipeline.del(metaKey);
            pipeline.del(msgsKey);
            pipeline.zrem(userChatsKey, chatId);
            await pipeline.exec();
            recordCacheSuccess();
            return; // Success, exit
        } catch (error) {
            if (attempt === maxRetries) {
                // Final attempt failed
                recordCacheFailure("deleteChatFromCache", error);
                logError("Cache delete failed after retries", {
                    chatId,
                    attempt,
                    error,
                });
            } else {
                // Exponential backoff: 100ms, 200ms, 400ms...
                const backoffMs = 2 ** (attempt - 1) * 100;
                logWarn(
                    `Cache delete attempt ${attempt} failed, retrying in ${backoffMs}ms`,
                    {
                        chatId,
                        error,
                    }
                );
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
        }
    }
}

/**
 * Get user's chats from ZSET (paginated, sorted by updatedAt desc)
 */
export async function getUserChatsFromCache(
    userId: string,
    limit = 10,
    offset = 0
): Promise<{ chatId: string; title: string }[]> {
    const redis = getRedisClient();
    if (!redis) {
        return [];
    }

    try {
        // Get from ZSET in reverse order (newest first)
        const items = await redis.zrange<string[]>(
            CacheKeys.userChats(userId),
            offset,
            offset + limit - 1,
            { rev: true }
        );

        // Deduplicate chat IDs defensively
        const uniqueChatIdsSet = new Set<string>();
        const uniqueChatIds: string[] = [];
        for (const item of items) {
            if (!uniqueChatIdsSet.has(item)) {
                uniqueChatIdsSet.add(item);
                uniqueChatIds.push(item);
            }
            if (uniqueChatIds.length >= limit) {
                break;
            }
        }

        return uniqueChatIds.map((cid) => ({
            chatId: cid,
            title: "New Chat",
        }));
    } catch (error) {
        logError("Redis getUserChatsFromCache error", error);
        return [];
    }
}

/**
 * Get message count for a chat - O(1)
 * Uses ZCARD for ZSET cardinality
 */
export async function getMessageCountFromCache(
    chatId: string,
    userId: string
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    try {
        const msgsKey = CacheKeys.chatMessages(chatId, userId);
        const count = await redis.zcard(msgsKey);
        return count || 0;
    } catch (error) {
        logError("Redis getMessageCountFromCache error", error);
        return 0;
    }
}

/**
 * =============================================================================
 * DOCUMENT OPERATIONS
 * =============================================================================
 */

// Get document from cache
export async function getDocumentFromCache(
    documentId: string,
    userId: string
): Promise<CachedDocument | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    try {
        const cached = await redis.get<CachedDocument>(
            CacheKeys.document(documentId, userId)
        );
        return cached;
    } catch (error) {
        logError("Redis getDocumentFromCache error", error);
        return null;
    }
}

// Set document in cache
export async function setDocumentInCache(
    documentId: string,
    userId: string,
    document: CachedDocument
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        await redis.set(CacheKeys.document(documentId, userId), document);
    } catch (error) {
        logError("Redis setDocumentInCache error", error);
    }
}

// Append new version to document cache
export async function appendDocumentVersionToCache(
    documentId: string,
    userId: string,
    version: DocumentVersion,
    opts?: { chatId?: string }
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const docKey = CacheKeys.document(documentId, userId);
        const chatId = opts?.chatId ?? "";

        // Atomic Lua script to append version or create document
        const script = `
			local cached = redis.call('GET', KEYS[1])
			if not cached then
				local newDoc = {
					id = ARGV[1],
					userId = ARGV[2],
					chatId = ARGV[3],
					versions = { cjson.decode(ARGV[4]) }
				}
				redis.call('SET', KEYS[1], cjson.encode(newDoc))
				return 1
			end
			local doc = cjson.decode(cached)
			table.insert(doc.versions, cjson.decode(ARGV[4]))
			redis.call('SET', KEYS[1], cjson.encode(doc))
			return 1
		`;

        await redis.eval(
            script,
            [docKey],
            [documentId, userId, chatId, JSON.stringify(version)]
        );
    } catch (error) {
        logError("Redis appendDocumentVersionToCache error", error);
    }
}

// Delete document versions from cache after timestamp
export async function deleteDocumentVersionsFromCacheAfterTimestamp(
    documentId: string,
    userId: string,
    timestamp: Date
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const docKey = CacheKeys.document(documentId, userId);
        const timestampMs = timestamp.getTime();

        const script = `
			local cached = redis.call('GET', KEYS[1])
			if not cached then
				return 0
			end
			local doc = cjson.decode(cached)
			local filtered = {}
			local cutoff = tonumber(ARGV[1])
			for i, version in ipairs(doc.versions) do
				local versionTime = 0
				if version.createdAt then
					local pattern = "(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)"
					local y, m, d, h, min, s = string.match(version.createdAt, pattern)
					if y then
						versionTime = os.time({year=tonumber(y), month=tonumber(m), day=tonumber(d), hour=tonumber(h), min=tonumber(min), sec=tonumber(s)}) * 1000
					end
				end
				if versionTime <= cutoff then
					table.insert(filtered, version)
				end
			end
			doc.versions = filtered
			redis.call('SET', KEYS[1], cjson.encode(doc))
			return 1
		`;

        await redis.eval(script, [docKey], [timestampMs.toString()]);
    } catch (error) {
        logError(
            "Redis deleteDocumentVersionsFromCacheAfterTimestamp error",
            error
        );
    }
}

/**
 * =============================================================================
 * CONVERSION HELPERS
 * =============================================================================
 */

export function chatToCache(chat: Chat, messages: DBMessage[]): CachedChat {
    return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        visibility: chat.visibility,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        lastContext: chat.lastContext,
        messages: messages.map(dbMessageToCachedMessage),
        version: 1,
    };
}

export function documentsToCache(documents: Document[]): CachedDocument | null {
    if (documents.length === 0) {
        return null;
    }

    const first = documents[0];
    if (!first) {
        return null;
    }
    return {
        id: first.id,
        userId: first.userId,
        chatId: first.chatId,
        versions: documents.map((doc) => ({
            title: doc.title,
            content: doc.content,
            kind: doc.kind,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        })),
    };
}

/**
 * =============================================================================
 * CACHE WARMING
 * =============================================================================
 */

export async function warmChatCache(
    chatId: string,
    userId: string,
    chat: Chat,
    messages: DBMessage[]
): Promise<void> {
    if (!isRedisAvailable()) {
        return;
    }

    const cached = chatToCache(chat, messages);
    await setChatInCache(chatId, userId, cached);
}

export async function warmDocumentCache(
    documentId: string,
    userId: string,
    documents: Document[]
): Promise<void> {
    if (!isRedisAvailable()) {
        return;
    }

    const cached = documentsToCache(documents);
    if (cached) {
        await setDocumentInCache(documentId, userId, cached);
    }
}

/**
 * Lua script for atomic deletion of all user chats
 * Keys: [userChatsKey]
 * Args: [userId]
 *
 * Returns: number of chats deleted
 */
const DELETE_ALL_USER_CHATS_SCRIPT = `
local userChatsKey = KEYS[1]
local userId = ARGV[1]

-- Get all chat IDs for this user
local chatIds = redis.call('ZRANGE', userChatsKey, 0, -1)
local count = #chatIds

-- Delete each chat's meta and messages keys
for _, chatId in ipairs(chatIds) do
    local metaKey = 'chat:' .. chatId .. ':' .. userId .. ':meta'
    local msgsKey = 'chat:' .. chatId .. ':' .. userId .. ':msgs'
    redis.call('DEL', metaKey, msgsKey)
end

-- Delete the user chats index
redis.call('DEL', userChatsKey)

return count
`;

/**
 * Atomically delete all chats for a user from cache
 * Uses Lua script to ensure atomic operation and prevent race conditions
 *
 * @param userId User ID
 * @returns Number of chats deleted
 */
export async function deleteAllChatsFromCache(userId: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    if (isCircuitOpen()) {
        logWarn("Circuit breaker open - skipping deleteAllChatsFromCache");
        return 0;
    }

    const userChatsKey = CacheKeys.userChats(userId);

    try {
        const result = await redis.eval(
            DELETE_ALL_USER_CHATS_SCRIPT,
            [userChatsKey],
            [userId]
        );
        recordCacheSuccess();
        return (result as number) ?? 0;
    } catch (error) {
        recordCacheFailure("deleteAllChatsFromCache", error);
        logError("Failed to delete all chats from cache", { userId, error });
        return 0;
    }
}
