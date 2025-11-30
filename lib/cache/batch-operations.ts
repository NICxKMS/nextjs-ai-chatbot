import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { logError } from "@/lib/log";
import type { AppUsage } from "../usage";
import {
	appendMessagesToCache,
	setChatInCache,
} from "./operations";
import { getRedisClient } from "./redis";
import { type CachedChatMeta, type CachedMessage, CacheKeys } from "./types";

/**
 * =============================================================================
 * OPTIMIZED BATCH OPERATIONS (Redis ZSET-based)
 * =============================================================================
 *
 * These operations leverage ZSET structure for O(log N) appends and
 * O(log N + M) range deletions.
 */

/**
 * Cache TTL constant (imported value)
 */
const GUEST_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Get timestamp score for a message (milliseconds since epoch)
 */
function getMessageScore(message: CachedMessage): number {
	return new Date(message.createdAt).getTime();
}

/**
 * Apply TTL for guest users on multiple keys via pipeline
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
 * Lua script for atomic batch update - avoids GET round-trip
 * Updates metadata and appends messages using ZADD in single operation
 * Returns 1 if successful, 0 if chat doesn't exist
 */
const BATCH_UPDATE_SCRIPT = `
local meta = redis.call('GET', KEYS[1])
if not meta then
	return 0
end
local data = cjson.decode(meta)
local updates = cjson.decode(ARGV[1])
local now = ARGV[2]
local userChatsScore = tonumber(ARGV[3])
local chatId = ARGV[4]
local msgCount = tonumber(ARGV[5])

-- Apply updates to metadata
if updates.lastContext then
	data.lastContext = updates.lastContext
end
if updates.title then
	data.title = updates.title
end
data.updatedAt = now
data.version = (data.version or 0) + 1

-- Save updated metadata
redis.call('SET', KEYS[1], cjson.encode(data))

-- Add messages to ZSET (ARGV[6] onwards: score1, msg1, score2, msg2, ...)
for i = 6, 6 + (msgCount * 2) - 1, 2 do
	local msgScore = tonumber(ARGV[i])
	local msgStr = ARGV[i + 1]
	if msgScore and msgStr then
		redis.call('ZADD', KEYS[2], msgScore, msgStr)
	end
end

-- Update user chats ZSET
redis.call('ZADD', KEYS[3], userChatsScore, chatId)

return 1
`;

/**
 * Lua script for atomic create-or-update operation - single round-trip
 * Creates new chat or updates existing chat atomically using ZADD for messages
 * Returns: "created" if new chat, "updated" if existing, "error" on failure
 */
const CREATE_OR_UPDATE_SCRIPT = `
local metaKey = KEYS[1]
local msgsKey = KEYS[2]
local userChatsKey = KEYS[3]

local existingMeta = redis.call('GET', metaKey)
local newMetaJson = ARGV[1]
local userChatsScore = tonumber(ARGV[2])
local chatId = ARGV[3]
local msgCount = tonumber(ARGV[4])

if existingMeta then
	-- Update existing chat
	local data = cjson.decode(existingMeta)
	local updates = cjson.decode(ARGV[5])
	
	-- Apply updates
	if updates.title then
		data.title = updates.title
	end
	if updates.lastContext then
		data.lastContext = updates.lastContext
	end
	data.updatedAt = updates.updatedAt
	data.version = (data.version or 0) + 1
	
	-- Save updated metadata
	redis.call('SET', metaKey, cjson.encode(data))
	
	-- Add messages to ZSET (ARGV[6] onwards: score1, msg1, score2, msg2, ...)
	for i = 6, 6 + (msgCount * 2) - 1, 2 do
		local msgScore = tonumber(ARGV[i])
		local msgStr = ARGV[i + 1]
		if msgScore and msgStr then
			redis.call('ZADD', msgsKey, msgScore, msgStr)
		end
	end
	
	-- Update user chats ZSET
	redis.call('ZADD', userChatsKey, userChatsScore, chatId)
	
	return "updated"
else
	-- Create new chat
	redis.call('SET', metaKey, newMetaJson)
	
	-- Add messages to ZSET (ARGV[6] onwards: score1, msg1, score2, msg2, ...)
	for i = 6, 6 + (msgCount * 2) - 1, 2 do
		local msgScore = tonumber(ARGV[i])
		local msgStr = ARGV[i + 1]
		if msgScore and msgStr then
			redis.call('ZADD', msgsKey, msgScore, msgStr)
		end
	end
	
	-- Update user chats ZSET
	redis.call('ZADD', userChatsKey, userChatsScore, chatId)
	
	return "created"
end
`;

/**
 * Update chat with messages and context in a single cache operation
 * Uses atomic Lua script with ZADD for messages - single round-trip!
 * @param opts.skipExistenceCheck - Skip existence check when caller confirms chat exists
 */
export async function batchUpdateChatCache({
	chatId,
	userId,
	messages,
	lastContext,
	title,
	skipExistenceCheck,
}: {
	chatId: string;
	userId: string;
	messages?: CachedMessage[];
	lastContext?: AppUsage;
	title?: string;
	skipExistenceCheck?: boolean;
}): Promise<void> {
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

		// Prepare updates object
		const updates: { lastContext?: AppUsage; title?: string } = {};
		if (lastContext) updates.lastContext = lastContext;
		if (title) updates.title = title;

		// Prepare score-message pairs for ZSET
		const scoreMessagePairs: string[] = [];
		if (messages) {
			for (const msg of messages) {
				scoreMessagePairs.push(getMessageScore(msg).toString());
				scoreMessagePairs.push(JSON.stringify(msg));
			}
		}

		// Use Lua script for atomic operation (single round-trip)
		const args = [
			JSON.stringify(updates),
			now,
			Date.now().toString(),
			chatId,
			(messages?.length ?? 0).toString(),
			...scoreMessagePairs,
		];

		const result = await redis.eval(
			BATCH_UPDATE_SCRIPT,
			[metaKey, msgsKey, userChatsKey],
			args
		);

		// Apply TTL for guest users if update was successful
		if (result === 1 && isGuest) {
			const pipeline = redis.pipeline();
			pipeline.expire(metaKey, GUEST_CACHE_TTL_SECONDS);
			pipeline.expire(msgsKey, GUEST_CACHE_TTL_SECONDS);
			pipeline.expire(userChatsKey, GUEST_CACHE_TTL_SECONDS);
			await pipeline.exec();
		}
	} catch (error) {
		logError("Redis batchUpdateChatCache error", error);
	}
}

/**
 * Create or update chat with messages and metadata in a single operation
 * Uses atomic Lua script with ZADD - single round-trip for both create and update!
 * @param isNewChat - Hint that this is a new chat (optimization only, script handles both)
 */
export async function createOrUpdateChatWithMessages({
	chatId,
	userId,
	title,
	visibility,
	messages,
	lastContext,
	createdAt,
	isNewChat,
}: {
	chatId: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
	messages: CachedMessage[];
	lastContext?: AppUsage;
	createdAt?: Date;
	isNewChat?: boolean;
}): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const metaKey = CacheKeys.chatMeta(chatId, userId);
		const msgsKey = CacheKeys.chatMessages(chatId, userId);
		const userChatsKey = CacheKeys.userChats(userId);
		const now = new Date();
		const nowStr = now.toISOString();
		const isGuest = userId.startsWith("guest:");

		// Prepare new metadata (used if creating new chat)
		const newMeta: CachedChatMeta = {
			id: chatId,
			userId,
			title,
			visibility,
			createdAt: createdAt ? createdAt.toISOString() : nowStr,
			updatedAt: nowStr,
			lastContext: lastContext || null,
			version: 1,
		};

		// Prepare updates for existing chat
		const updates = {
			title,
			lastContext: lastContext || null,
			updatedAt: nowStr,
		};

		// Prepare score-message pairs for ZSET
		const scoreMessagePairs: string[] = [];
		for (const msg of messages) {
			scoreMessagePairs.push(getMessageScore(msg).toString());
			scoreMessagePairs.push(JSON.stringify(msg));
		}

		// Use Lua script for atomic operation (single round-trip!)
		const result = await redis.eval(
			CREATE_OR_UPDATE_SCRIPT,
			[metaKey, msgsKey, userChatsKey],
			[
				JSON.stringify(newMeta),
				Date.now().toString(),
				chatId,
				messages.length.toString(),
				JSON.stringify(updates),
				...scoreMessagePairs,
			]
		);

		// Apply TTL for guest users (separate round-trip, but only for guests)
		if (isGuest) {
			const pipeline = redis.pipeline();
			pipeline.expire(metaKey, GUEST_CACHE_TTL_SECONDS);
			pipeline.expire(msgsKey, GUEST_CACHE_TTL_SECONDS);
			pipeline.expire(userChatsKey, GUEST_CACHE_TTL_SECONDS);
			await pipeline.exec();
		}
	} catch (error) {
		logError("Redis createOrUpdateChatWithMessages error", error);
	}
}
