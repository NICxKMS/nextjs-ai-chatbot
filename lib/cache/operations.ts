import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { logError } from "@/lib/log";
import type { Chat, DBMessage, Document } from "../db/schema";
import type { AppUsage } from "../usage";
import { dbMessageToCachedMessage } from "./helpers";
import { withCacheMetrics } from "./metrics";
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
 * Cache TTL Constants
 */
const GUEST_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * =============================================================================
 * HELPER FUNCTIONS
 * =============================================================================
 */

/**
 * Parse raw message strings from Redis ZSET into CachedMessage objects
 * ZSET returns members as strings (the JSON we stored)
 */
function parseMessagesFromRaw(messagesRaw: unknown[]): CachedMessage[] {
	return (messagesRaw || []).map((msgStr) => {
		if (typeof msgStr === "string") {
			return JSON.parse(msgStr) as CachedMessage;
		}
		return msgStr as CachedMessage;
	});
}

/**
 * Get timestamp score for a message (milliseconds since epoch)
 *
 * To ensure proper ordering when messages have the same timestamp,
 * we add a role-based offset in microseconds:
 * - user messages: +0.001 ms (to sort first)
 * - assistant messages: +0.002 ms (to sort second)
 * - system messages: +0.000 ms (to sort before user)
 *
 * This guarantees: system < user < assistant for same-timestamp messages
 */
function getMessageScore(message: CachedMessage): number {
	const baseTimestamp = new Date(message.createdAt).getTime();

	// Add role-based microsecond offset to ensure correct ordering
	// when multiple messages share the same createdAt timestamp
	let roleOffset = 0;
	if (message.role === "user") {
		roleOffset = 0.001; // User messages sort first (after system)
	} else if (message.role === "assistant") {
		roleOffset = 0.002; // Assistant messages sort after user
	}
	// system messages get 0 offset (sort before user)

	return baseTimestamp + roleOffset;
}

/**
 * Apply TTL for guest users on multiple keys via pipeline
 * Centralizes the repetitive TTL application pattern
 */
function applyGuestTTL(
	pipeline: ReturnType<import("@upstash/redis").Redis["pipeline"]>,
	keys: string[],
	userId: string
): void {
	if (userId.startsWith("guest:")) {
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
	const result = await withCacheMetrics("get_chat", async () => {
		const redis = getRedisClient();
		if (!redis) {
			return null;
		}

		try {
			const metaKey = CacheKeys.chatMeta(chatId, userId);
			const msgsKey = CacheKeys.chatMessages(chatId, userId);

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
				return null;
			}

			// Parse messages using centralized helper
			const messages = parseMessagesFromRaw(messagesRaw);

			return {
				...meta,
				messages,
			};
		} catch (error) {
			logError("Redis getChatFromCache error", error);
			return null;
		}
	});

	return result ?? null;
} /**
 * Get chat metadata only (without messages) - faster for list views
 */
export async function getChatMetaFromCache(
	chatId: string,
	userId: string
): Promise<CachedChatMeta | null> {
	const redis = getRedisClient();
	if (!redis) {
		return null;
	}

	try {
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		if (!metaKey) {
			return null;
		}
		return await redis.get<CachedChatMeta>(metaKey);
	} catch (error) {
		logError("Redis getChatMetaFromCache error", error);
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
	const redis = getRedisClient();
	if (!redis) {
		return [];
	}

	try {
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		// Get last N messages (highest scores = newest)
		const messagesRaw = await redis.zrange(msgsKey, -count, -1);

		return parseMessagesFromRaw(messagesRaw);
	} catch (error) {
		logError("Redis getLastMessagesFromCache error", error);
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
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);

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
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);
		const now = new Date().toISOString();
		const isGuest = userId.startsWith("guest:");
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
			if (isGuest) {
				pipeline.expire(msgsKey, GUEST_CACHE_TTL_SECONDS);
				pipeline.expire(userChatsKey, GUEST_CACHE_TTL_SECONDS);
			}

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
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);
		const now = new Date().toISOString();
		const isGuest = userId.startsWith("guest:");

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
			if (isGuest) {
				pipeline.expire(msgsKey, GUEST_CACHE_TTL_SECONDS);
				pipeline.expire(userChatsKey, GUEST_CACHE_TTL_SECONDS);
			}

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
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
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
		const metaKey = CacheKeys.chatMeta(chatId, userId);
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
 * Delete chat from cache
 */
export async function deleteChatFromCache(
	chatId: string,
	userId: string
): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);

		// Delete all keys atomically
		const pipeline = redis.pipeline();
		pipeline.del(metaKey);
		pipeline.del(msgsKey);
		pipeline.zrem(userChatsKey, chatId);
		await pipeline.exec();
	} catch (error) {
		logError("Redis deleteChatFromCache error", error);
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
