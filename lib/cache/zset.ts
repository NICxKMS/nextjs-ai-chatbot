/**
 * Redis Sorted Set (ZSET) Cache Operations
 *
 * Provides ZSET operations for chat list management and message storage.
 * ZSETs enable efficient range queries and ordering by score (timestamps).
 *
 * Performance characteristics:
 * - ZADD: O(log N) for adding members
 * - ZREM: O(log N) for removing members
 * - ZRANGE/ZREVRANGE: O(log N + M) where M = elements returned
 * - ZCARD: O(1) for counting members
 * - ZREMRANGEBYSCORE: O(log N + M) where M = elements removed
 *
 * @module lib/cache/zset
 */

import "server-only"

import { logDebug, logError } from "@/lib/log"
import {
	isCircuitOpen,
	recordCacheFailure,
	recordCacheSuccess,
} from "./circuit-breaker"
import { getRedisClient } from "./client"
import { userChatsKey } from "./keys"
import type { UserChatListItem } from "./types"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for ZADD operation.
 */
export interface ZAddOptions {
	/** Time-to-live in seconds (applies EXPIRE after ZADD) */
	ttl?: number
}

/**
 * Member with score for sorted set operations.
 */
export interface ZMember<T = string> {
	/** The score used for ordering */
	score: number
	/** The member value */
	member: T
}

// =============================================================================
// Core ZSET Operations
// =============================================================================

/**
 * Add one or more members to a sorted set.
 *
 * @param key - The sorted set key
 * @param members - Array of member-score pairs to add
 * @param options - ZADD options (ttl)
 * @returns Number of members added
 *
 * @example
 * ```typescript
 * // Add a single message to chat messages ZSET
 * await zadd(`chat:${chatId}:${userId}:msgs`, [
 *   { score: Date.now(), member: JSON.stringify(message) }
 * ]);
 *
 * // Add chat to user's chat list with TTL for guest
 * await zadd(`user:${userId}:chats`, [
 *   { score: updatedAt, member: chatId }
 * ], { ttl: 3600 });
 * ```
 */
export async function zadd(
	key: string,
	members: ZMember[],
	options?: ZAddOptions,
): Promise<number> {
	if (isCircuitOpen()) {
		return 0
	}

	const redis = getRedisClient()
	if (!redis || members.length === 0) {
		return 0
	}

	try {
		const pipeline = redis.pipeline()

		// Add each member with score
		for (const { score, member } of members) {
			pipeline.zadd(key, { score, member })
		}

		// Apply TTL if specified
		if (options?.ttl !== undefined) {
			pipeline.expire(key, options.ttl)
		}

		const results = await pipeline.exec()

		// The last result is from EXPIRE if ttl was set
		// Sum up the ZADD results (each returns number added)
		const addedCount = results
			.slice(0, members.length)
			.reduce((sum: number, result) => {
				const value = Array.isArray(result) ? result[0] : result
				return sum + (typeof value === "number" ? value : 0)
			}, 0)

		recordCacheSuccess()
		logDebug("ZSET ZADD complete", { key, added: addedCount })
		return addedCount
	} catch (error) {
		recordCacheFailure("zadd", error)
		logError("ZSET ZADD error", error as Error, { key })
		return 0
	}
}

/**
 * Remove one or more members from a sorted set.
 *
 * @param key - The sorted set key
 * @param members - Member(s) to remove
 * @returns Number of members removed
 *
 * @example
 * ```typescript
 * // Remove a chat from user's chat list
 * await zrem(`user:${userId}:chats`, chatId);
 * ```
 */
export async function zrem(
	key: string,
	members: string | string[],
): Promise<number> {
	if (isCircuitOpen()) {
		return 0
	}

	const redis = getRedisClient()
	if (!redis) {
		return 0
	}

	try {
		const membersArray = Array.isArray(members) ? members : [members]
		const removed = await redis.zrem(key, ...membersArray)

		recordCacheSuccess()
		logDebug("ZSET ZREM complete", { key, removed })
		return removed
	} catch (error) {
		recordCacheFailure("zrem", error)
		logError("ZSET ZREM error", error as Error, { key })
		return 0
	}
}

/**
 * Get a range of members from a sorted set in ascending order (low to high score).
 *
 * @param key - The sorted set key
 * @param start - Start index (0-based, can be negative for end-relative)
 * @param stop - Stop index (inclusive, can be negative for end-relative)
 * @returns Array of members in ascending score order
 *
 * @example
 * ```typescript
 * // Get all messages (oldest first)
 * const messages = await zrange(`chat:${chatId}:${userId}:msgs`, 0, -1);
 *
 * // Get last 10 messages (oldest of the 10 newest)
 * const recentMessages = await zrange(`chat:${chatId}:${userId}:msgs`, -10, -1);
 * ```
 */
export async function zrange(
	key: string,
	start: number,
	stop: number,
): Promise<string[]> {
	if (isCircuitOpen()) {
		return []
	}

	const redis = getRedisClient()
	if (!redis) {
		return []
	}

	try {
		const results = await redis.zrange(key, start, stop)

		recordCacheSuccess()
		logDebug("ZSET ZRANGE complete", {
			key,
			start,
			stop,
			count: results.length,
		})
		return results as string[]
	} catch (error) {
		recordCacheFailure("zrange", error)
		logError("ZSET ZRANGE error", error as Error, { key })
		return []
	}
}

/**
 * Get a range of members from a sorted set in descending order (high to low score).
 * This is the primary operation for chat lists (newest first).
 *
 * @param key - The sorted set key
 * @param start - Start index (0-based, can be negative for end-relative)
 * @param stop - Stop index (inclusive, can be negative for end-relative)
 * @returns Array of members in descending score order
 *
 * @example
 * ```typescript
 * // Get user's chats sorted by most recent first
 * const chats = await zrevrange(`user:${userId}:chats`, 0, 9);
 *
 * // Get newest message first
 * const newestMessage = await zrevrange(`chat:${chatId}:${userId}:msgs`, 0, 0);
 * ```
 */
export async function zrevrange(
	key: string,
	start: number,
	stop: number,
): Promise<string[]> {
	if (isCircuitOpen()) {
		return []
	}

	const redis = getRedisClient()
	if (!redis) {
		return []
	}

	try {
		const results = await redis.zrange(key, start, stop, { rev: true })

		recordCacheSuccess()
		logDebug("ZSET ZREVRANGE complete", {
			key,
			start,
			stop,
			count: results.length,
		})
		return results as string[]
	} catch (error) {
		recordCacheFailure("zrevrange", error)
		logError("ZSET ZREVRANGE error", error as Error, { key })
		return []
	}
}

/**
 * Get the number of members in a sorted set.
 *
 * @param key - The sorted set key
 * @returns Number of members in the sorted set
 *
 * @example
 * ```typescript
 * // Get message count for a chat
 * const count = await zcard(`chat:${chatId}:${userId}:msgs`);
 * ```
 */
export async function zcard(key: string): Promise<number> {
	if (isCircuitOpen()) {
		return 0
	}

	const redis = getRedisClient()
	if (!redis) {
		return 0
	}

	try {
		const count = await redis.zcard(key)

		recordCacheSuccess()
		logDebug("ZSET ZCARD complete", { key, count })
		return count
	} catch (error) {
		recordCacheFailure("zcard", error)
		logError("ZSET ZCARD error", error as Error, { key })
		return 0
	}
}

/**
 * Remove all members in a sorted set with scores between min and max.
 * Useful for deleting messages after a timestamp.
 *
 * @param key - The sorted set key
 * @param min - Minimum score (inclusive)
 * @param max - Maximum score (inclusive)
 * @returns Number of members removed
 *
 * @example
 * ```typescript
 * // Delete all messages at or after a timestamp
 * await zremrangebyscore(
 *   `chat:${chatId}:${userId}:msgs`,
 *   timestamp.getTime(),
 *   Number.MAX_SAFE_INTEGER
 * );
 * ```
 */
export async function zremrangebyscore(
	key: string,
	min: number,
	max: number,
): Promise<number> {
	if (isCircuitOpen()) {
		return 0
	}

	const redis = getRedisClient()
	if (!redis) {
		return 0
	}

	try {
		const removed = await redis.zremrangebyscore(key, min, max)

		recordCacheSuccess()
		logDebug("ZSET ZREMRANGEBYSCORE complete", { key, min, max, removed })
		return removed
	} catch (error) {
		recordCacheFailure("zremrangebyscore", error)
		logError("ZSET ZREMRANGEBYSCORE error", error as Error, { key })
		return 0
	}
}

/**
 * Get members with their scores from a sorted set in descending order.
 * Useful when you need both the member and its score.
 *
 * @param key - The sorted set key
 * @param start - Start index
 * @param stop - Stop index
 * @returns Array of objects with member and score
 *
 * @example
 * ```typescript
 * // Get chats with their update timestamps
 * const chatsWithScores = await zrevrangeWithScores(`user:${userId}:chats`, 0, 9);
 * // Returns: [{ member: "chat-uuid", score: 1700000000000 }, ...]
 * ```
 */
export async function zrevrangeWithScores(
	key: string,
	start: number,
	stop: number,
): Promise<ZMember<string>[]> {
	if (isCircuitOpen()) {
		return []
	}

	const redis = getRedisClient()
	if (!redis) {
		return []
	}

	try {
		// Upstash Redis returns array of [member, score] pairs when withScores is true
		const results = await redis.zrange(key, start, stop, {
			rev: true,
			withScores: true,
		})

		// Parse the flat array into member-score pairs
		// When withScores is true, results is [member1, score1, member2, score2, ...]
		const members: ZMember<string>[] = []

		for (let i = 0; i < results.length; i += 2) {
			const member = results[i] as string
			const score = results[i + 1] as number
			members.push({ member, score })
		}

		recordCacheSuccess()
		logDebug("ZSET ZREVRANGE with scores complete", {
			key,
			start,
			stop,
			count: members.length,
		})
		return members
	} catch (error) {
		recordCacheFailure("zrevrangeWithScores", error)
		logError("ZSET ZREVRANGE with scores error", error as Error, { key })
		return []
	}
}

/**
 * Get the score of a member in a sorted set.
 *
 * @param key - The sorted set key
 * @param member - The member to get score for
 * @returns The score or null if member doesn't exist
 *
 * @example
 * ```typescript
 * // Get the update timestamp for a chat
 * const score = await zscore(`user:${userId}:chats`, chatId);
 * ```
 */
export async function zscore(
	key: string,
	member: string,
): Promise<number | null> {
	if (isCircuitOpen()) {
		return null
	}

	const redis = getRedisClient()
	if (!redis) {
		return null
	}

	try {
		const score = await redis.zscore(key, member)

		recordCacheSuccess()
		logDebug("ZSET ZSCORE complete", { key, member, score })
		return score
	} catch (error) {
		recordCacheFailure("zscore", error)
		logError("ZSET ZSCORE error", error as Error, { key })
		return null
	}
}

// =============================================================================
// Convenience Operations
// =============================================================================

/**
 * Add a single member to a sorted set with optional TTL.
 * Convenience wrapper around zadd for single-member operations.
 *
 * @param key - The sorted set key
 * @param score - The score for the member
 * @param member - The member to add
 * @param ttl - Optional TTL in seconds
 * @returns true if added successfully
 */
export async function zaddOne(
	key: string,
	score: number,
	member: string,
	ttl?: number,
): Promise<boolean> {
	const options = ttl !== undefined ? { ttl } : undefined
	const added = await zadd(key, [{ score, member }], options)
	return added > 0
}

/**
 * Get the newest member from a sorted set.
 * Convenience wrapper for getting the single highest-scored member.
 *
 * @param key - The sorted set key
 * @returns The newest member or null
 */
export async function zgetNewest(key: string): Promise<string | null> {
	const results = await zrevrange(key, 0, 0)
	return results.length > 0 ? (results[0] ?? null) : null
}

/**
 * Get the oldest member from a sorted set.
 * Convenience wrapper for getting the single lowest-scored member.
 *
 * @param key - The sorted set key
 * @returns The oldest member or null
 */
export async function zgetOldest(key: string): Promise<string | null> {
	const results = await zrange(key, 0, 0)
	return results.length > 0 ? (results[0] ?? null) : null
}

// =============================================================================
// Chat List Convenience APIs
// =============================================================================

function parseChatListMember(
	rawMember: string,
	fallbackUpdatedAt: number,
): UserChatListItem | null {
	try {
		const parsed = JSON.parse(rawMember) as Partial<UserChatListItem>
		if (typeof parsed.chatId !== "string") {
			return null
		}

		return {
			chatId: parsed.chatId,
			title: typeof parsed.title === "string" ? parsed.title : "New Chat",
			updatedAt:
				typeof parsed.updatedAt === "number"
					? parsed.updatedAt
					: fallbackUpdatedAt,
		}
	} catch {
		if (!rawMember) {
			return null
		}

		return {
			chatId: rawMember,
			title: "New Chat",
			updatedAt: fallbackUpdatedAt,
		}
	}
}

/**
 * Add or update a chat in a user's sorted chat list.
 */
export async function addToChatList(
	userId: string,
	chatMeta: UserChatListItem,
	options?: ZAddOptions,
): Promise<boolean> {
	const key = userChatsKey(userId)
	const member = JSON.stringify(chatMeta)

	const added = await zadd(
		key,
		[
			{
				score: chatMeta.updatedAt,
				member,
			},
		],
		options,
	)

	return added >= 0
}

/**
 * Remove a chat from a user's sorted chat list.
 */
export async function removeFromChatList(
	userId: string,
	chatId: string,
): Promise<number> {
	const key = userChatsKey(userId)
	const members = await zrange(key, 0, -1)

	if (members.length === 0) {
		return 0
	}

	const membersToRemove = members.filter((member) => {
		const parsed = parseChatListMember(member, 0)
		return parsed?.chatId === chatId
	})

	if (membersToRemove.length === 0) {
		return 0
	}

	return zrem(key, membersToRemove)
}

/**
 * Get a user's chat list ordered by most recently updated first.
 */
export async function getChatList(
	userId: string,
	offset = 0,
	limit = 10,
): Promise<UserChatListItem[]> {
	if (limit <= 0) {
		return []
	}

	const key = userChatsKey(userId)
	const stop = offset + limit - 1
	const entries = await zrevrangeWithScores(key, offset, stop)

	return entries
		.map((entry) => parseChatListMember(entry.member, entry.score))
		.filter((entry): entry is UserChatListItem => entry !== null)
}
