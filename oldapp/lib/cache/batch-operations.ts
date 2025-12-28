import "server-only";

import type { VisibilityType } from "@/components/visibility-selector";
import { GUEST_CACHE_TTL_SECONDS } from "@/lib/constants";
import { logError } from "@/lib/log";
import type { AppUsage } from "../usage";
import { getChatCacheKeys, getMessageScore, isGuestUserId } from "./helpers";
import { getRedisClient } from "./redis";
import { type CachedChatMeta, type CachedMessage, CacheKeys } from "./types";

/**
 * =============================================================================
 * OPTIMIZED BATCH OPERATIONS (Redis ZSET-based)
 * =============================================================================
 *
 * These operations leverage ZSET structure for O(log N) appends and
 * O(log N + M) range deletions.
 *
 * NOTE: getMessageScore is imported from helpers.ts - single source of truth
 */

/**
 * Lua script for atomic batch update - avoids GET round-trip
 * Updates metadata and appends messages using ZADD in single operation
 * Includes TTL application for guest users (eliminates separate EXPIRE round-trip)
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
local ttl = tonumber(ARGV[6])

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

-- Add messages to ZSET (ARGV[7] onwards: score1, msg1, score2, msg2, ...)
for i = 7, 7 + (msgCount * 2) - 1, 2 do
	local msgScore = tonumber(ARGV[i])
	local msgStr = ARGV[i + 1]
	if msgScore and msgStr then
		redis.call('ZADD', KEYS[2], msgScore, msgStr)
	end
end

-- Update user chats ZSET
redis.call('ZADD', KEYS[3], userChatsScore, chatId)

-- Apply TTL for guest users (ttl > 0 means guest)
if ttl > 0 then
	redis.call('EXPIRE', KEYS[1], ttl)
	redis.call('EXPIRE', KEYS[2], ttl)
	redis.call('EXPIRE', KEYS[3], ttl)
end

return 1
`;

/**
 * Lua script for atomic create-or-update operation - single round-trip
 * Creates new chat or updates existing chat atomically using ZADD for messages
 * Includes TTL application for guest users (eliminates separate EXPIRE round-trip)
 * Returns: "created" if new chat, "updated" if existing, "error" on failure
 *
 * FIX Issue 6.1: TTL is now at fixed position ARGV[6] for reliability
 * ARGV layout:
 *   [1] newMetaJson
 *   [2] userChatsScore
 *   [3] chatId
 *   [4] msgCount
 *   [5] updatesJson
 *   [6] ttl (FIXED POSITION)
 *   [7+] score1, msg1, score2, msg2, ...
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
local ttl = tonumber(ARGV[6])

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
	
	-- Add messages to ZSET (ARGV[7] onwards: score1, msg1, score2, msg2, ...)
	for i = 7, 7 + (msgCount * 2) - 1, 2 do
		local msgScore = tonumber(ARGV[i])
		local msgStr = ARGV[i + 1]
		if msgScore and msgStr then
			redis.call('ZADD', msgsKey, msgScore, msgStr)
		end
	end
	
	-- Update user chats ZSET
	redis.call('ZADD', userChatsKey, userChatsScore, chatId)
	
	-- Apply TTL for guest users (ttl > 0 means guest)
	if ttl > 0 then
		redis.call('EXPIRE', metaKey, ttl)
		redis.call('EXPIRE', msgsKey, ttl)
		redis.call('EXPIRE', userChatsKey, ttl)
	end
	
	return "updated"
else
	-- Create new chat
	redis.call('SET', metaKey, newMetaJson)
	
	-- Add messages to ZSET (ARGV[7] onwards: score1, msg1, score2, msg2, ...)
	for i = 7, 7 + (msgCount * 2) - 1, 2 do
		local msgScore = tonumber(ARGV[i])
		local msgStr = ARGV[i + 1]
		if msgScore and msgStr then
			redis.call('ZADD', msgsKey, msgScore, msgStr)
		end
	end
	
	-- Update user chats ZSET
	redis.call('ZADD', userChatsKey, userChatsScore, chatId)
	
	-- Apply TTL for guest users (ttl > 0 means guest)
	if ttl > 0 then
		redis.call('EXPIRE', metaKey, ttl)
		redis.call('EXPIRE', msgsKey, ttl)
		redis.call('EXPIRE', userChatsKey, ttl)
	end
	
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
    _skipExistenceCheck,
}: {
    chatId: string;
    userId: string;
    messages?: CachedMessage[];
    lastContext?: AppUsage;
    title?: string;
    _skipExistenceCheck?: boolean;
}): Promise<void> {
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

        // Prepare updates object
        const updates: { lastContext?: AppUsage; title?: string } = {};
        if (lastContext) {
            updates.lastContext = lastContext;
        }
        if (title) {
            updates.title = title;
        }

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
            isGuest ? GUEST_CACHE_TTL_SECONDS.toString() : "0",
            ...scoreMessagePairs,
        ];

        await redis.eval(
            BATCH_UPDATE_SCRIPT,
            [metaKey, msgsKey, userChatsKey],
            args
        );
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
    _isNewChat,
}: {
    chatId: string;
    userId: string;
    title: string;
    visibility: VisibilityType;
    messages: CachedMessage[];
    lastContext?: AppUsage;
    createdAt?: Date;
    _isNewChat?: boolean;
}): Promise<void> {
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
        const now = new Date();
        const nowStr = now.toISOString();
        const isGuest = isGuestUserId(userId);

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
        // FIX Issue 6.1: TTL at fixed position ARGV[6] before message pairs
        await redis.eval(
            CREATE_OR_UPDATE_SCRIPT,
            [metaKey, msgsKey, userChatsKey],
            [
                JSON.stringify(newMeta), // ARGV[1]
                Date.now().toString(), // ARGV[2]
                chatId, // ARGV[3]
                messages.length.toString(), // ARGV[4]
                JSON.stringify(updates), // ARGV[5]
                isGuest ? GUEST_CACHE_TTL_SECONDS.toString() : "0", // ARGV[6] - TTL
                ...scoreMessagePairs, // ARGV[7+]
            ]
        );
    } catch (error) {
        logError("Redis createOrUpdateChatWithMessages error", error);
    }
}
