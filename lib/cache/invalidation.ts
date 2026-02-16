/**
 * Cache Invalidation Helpers
 *
 * Entity-specific invalidation helpers with cascade invalidation logic.
 * Uses pattern-based batch invalidation with Redis SCAN for safe bulk operations.
 *
 * @module lib/cache/invalidation
 */

import "server-only"

import { logDebug, logError, logInfo } from "@/lib/log"
import { getRedisClient } from "./client"
import {
	artifactKey,
	chatKey,
	chatKeysPattern,
	chatMessagesKey,
	chatMessagesPattern,
	chatMetaKey,
	messageKey,
	userChatsKey,
	userKey,
	userKeysPattern,
} from "./keys"

// =============================================================================
// Types
// =============================================================================

/**
 * Result of an invalidation operation.
 */
export interface InvalidationResult {
	/** Number of keys invalidated */
	keysInvalidated: number
	/** Whether the operation succeeded */
	success: boolean
	/** Any errors encountered */
	errors: Error[]
}

/**
 * Options for invalidation operations.
 */
export interface InvalidationOptions {
	/** Skip cascade invalidation (only invalidate the primary key) */
	skipCascade?: boolean
	/** User ID for ownership-scoped invalidation */
	userId?: string
}

// =============================================================================
// Core Invalidation Utilities
// =============================================================================

/**
 * Delete multiple keys from cache.
 *
 * @param keys - Cache keys to delete
 * @returns Number of keys deleted
 */
async function deleteKeys(keys: string[]): Promise<number> {
	const redis = getRedisClient()

	if (!redis || keys.length === 0) {
		return 0
	}

	try {
		await redis.del(...keys)
		return keys.length
	} catch (error) {
		logError("Failed to delete keys", error as Error, {
			keyCount: keys.length,
		})
		return 0
	}
}

/**
 * Scan and delete keys matching a pattern.
 * Uses Redis SCAN for safe iteration (not KEYS command).
 *
 * @param pattern - Pattern to match
 * @returns Number of keys deleted
 */
async function scanAndDelete(pattern: string): Promise<number> {
	const redis = getRedisClient()

	if (!redis) {
		return 0
	}

	try {
		let count = 0
		let cursor = "0"

		do {
			const [nextCursor, keys] = await redis.scan(cursor, {
				match: pattern,
				count: 100,
			})

			cursor = nextCursor

			if (keys.length > 0) {
				await redis.del(...keys)
				count += keys.length
			}
		} while (cursor !== "0")

		return count
	} catch (error) {
		logError("Scan and delete failed", error as Error, { pattern })
		return 0
	}
}

/**
 * Scan and collect keys matching a pattern.
 *
 * @param pattern - Pattern to match
 * @returns Array of matching keys
 */
async function scanKeys(pattern: string): Promise<string[]> {
	const redis = getRedisClient()

	if (!redis) {
		return []
	}

	try {
		const keys: string[] = []
		let cursor = "0"

		do {
			const [nextCursor, batch] = await redis.scan(cursor, {
				match: pattern,
				count: 100,
			})

			cursor = nextCursor
			keys.push(...batch)
		} while (cursor !== "0")

		return keys
	} catch (error) {
		logError("Scan keys failed", error as Error, { pattern })
		return []
	}
}

// =============================================================================
// Entity-Specific Invalidation
// =============================================================================

/**
 * Invalidate all cache entries for a specific chat.
 *
 * Cascade invalidation:
 * - Chat entity
 * - Chat metadata
 * - All messages in the chat
 * - Chat messages list
 *
 * @param chatId - Chat UUID
 * @param options - Invalidation options (userId for scoped invalidation)
 * @returns Invalidation result
 *
 * @example
 * ```typescript
 * await invalidateChat('chat-123', { userId: 'user-456' });
 * ```
 */
export async function invalidateChat(
	chatId: string,
	options?: InvalidationOptions,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	try {
		const keysToDelete: string[] = []

		// Primary chat key
		keysToDelete.push(chatKey(chatId))

		// If userId provided, invalidate user-scoped keys
		if (options?.userId) {
			keysToDelete.push(chatMetaKey(chatId, options.userId))
			keysToDelete.push(chatMessagesKey(chatId, options.userId))
		}

		// Delete specific keys
		const deletedCount = await deleteKeys(keysToDelete)
		result.keysInvalidated += deletedCount

		// Cascade: invalidate all chat-related keys via pattern
		if (!options?.skipCascade) {
			const patternCount = await scanAndDelete(chatKeysPattern(chatId))
			result.keysInvalidated += patternCount

			// Also invalidate message lists for this chat
			const messagesPatternCount = await scanAndDelete(
				chatMessagesPattern(chatId),
			)
			result.keysInvalidated += messagesPatternCount
		}

		logDebug("Chat cache invalidated", {
			chatId,
			keysInvalidated: result.keysInvalidated,
			cascade: !options?.skipCascade,
		})
	} catch (error) {
		result.success = false
		result.errors.push(error as Error)
		logError("Chat invalidation failed", error as Error, { chatId })
	}

	return result
}

/**
 * Invalidate all cache entries for a specific user.
 *
 * Cascade invalidation:
 * - User entity
 * - User's chat list
 * - All user-scoped keys
 *
 * @param userId - User UUID
 * @param options - Invalidation options
 * @returns Invalidation result
 *
 * @example
 * ```typescript
 * await invalidateUser('user-456');
 * ```
 */
export async function invalidateUser(
	userId: string,
	options?: InvalidationOptions,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	try {
		const keysToDelete: string[] = []

		// Primary user key
		keysToDelete.push(userKey(userId))

		// User's chat list
		keysToDelete.push(userChatsKey(userId))

		// Delete specific keys
		const deletedCount = await deleteKeys(keysToDelete)
		result.keysInvalidated += deletedCount

		// Cascade: invalidate all user-related keys via pattern
		if (!options?.skipCascade) {
			const patternCount = await scanAndDelete(userKeysPattern(userId))
			result.keysInvalidated += patternCount
		}

		logDebug("User cache invalidated", {
			userId,
			keysInvalidated: result.keysInvalidated,
			cascade: !options?.skipCascade,
		})
	} catch (error) {
		result.success = false
		result.errors.push(error as Error)
		logError("User invalidation failed", error as Error, { userId })
	}

	return result
}

/**
 * Invalidate cache entries for a specific message.
 *
 * Cascade invalidation:
 * - Message entity
 * - Parent chat's message list
 *
 * @param messageId - Message UUID
 * @param chatId - Parent chat UUID
 * @param options - Invalidation options (userId for scoped invalidation)
 * @returns Invalidation result
 *
 * @example
 * ```typescript
 * await invalidateMessage('msg-789', 'chat-123', { userId: 'user-456' });
 * ```
 */
export async function invalidateMessage(
	messageId: string,
	chatId: string,
	options?: InvalidationOptions,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	try {
		const keysToDelete: string[] = []

		// Primary message key
		keysToDelete.push(messageKey(messageId))

		// Invalidate chat's message list
		if (options?.userId) {
			keysToDelete.push(chatMessagesKey(chatId, options.userId))
		}

		// Delete specific keys
		const deletedCount = await deleteKeys(keysToDelete)
		result.keysInvalidated += deletedCount

		// Cascade: invalidate all message lists for this chat
		if (!options?.skipCascade) {
			const patternCount = await scanAndDelete(
				chatMessagesPattern(chatId),
			)
			result.keysInvalidated += patternCount
		}

		logDebug("Message cache invalidated", {
			messageId,
			chatId,
			keysInvalidated: result.keysInvalidated,
			cascade: !options?.skipCascade,
		})
	} catch (error) {
		result.success = false
		result.errors.push(error as Error)
		logError("Message invalidation failed", error as Error, {
			messageId,
			chatId,
		})
	}

	return result
}

/**
 * Invalidate cache entries for a specific artifact.
 *
 * Cascade invalidation:
 * - Artifact entity
 * - Parent chat's cache (if chatId provided)
 *
 * @param artifactId - Artifact UUID
 * @param options - Invalidation options (chatId for cascade)
 * @returns Invalidation result
 *
 * @example
 * ```typescript
 * await invalidateArtifact('artifact-abc', { chatId: 'chat-123' });
 * ```
 */
export async function invalidateArtifact(
	artifactId: string,
	options?: InvalidationOptions & { chatId?: string },
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	try {
		const keysToDelete: string[] = []

		// Primary artifact key
		keysToDelete.push(artifactKey(artifactId))

		// Delete specific keys
		const deletedCount = await deleteKeys(keysToDelete)
		result.keysInvalidated += deletedCount

		// Cascade: invalidate parent chat if provided
		if (!options?.skipCascade && options?.chatId) {
			const chatResult = await invalidateChat(options.chatId, {
				...(options.userId ? { userId: options.userId } : {}),
				skipCascade: true, // Don't cascade further
			})
			result.keysInvalidated += chatResult.keysInvalidated
			if (!chatResult.success) {
				result.errors.push(...chatResult.errors)
			}
		}

		logDebug("Artifact cache invalidated", {
			artifactId,
			keysInvalidated: result.keysInvalidated,
			cascade: !options?.skipCascade,
		})
	} catch (error) {
		result.success = false
		result.errors.push(error as Error)
		logError("Artifact invalidation failed", error as Error, { artifactId })
	}

	return result
}

// =============================================================================
// Batch Invalidation
// =============================================================================

/**
 * Invalidate multiple chats in a single operation.
 *
 * @param chatIds - Array of chat UUIDs
 * @param options - Invalidation options
 * @returns Combined invalidation result
 *
 * @example
 * ```typescript
 * await invalidateChats(['chat-1', 'chat-2', 'chat-3']);
 * ```
 */
export async function invalidateChats(
	chatIds: string[],
	options?: InvalidationOptions,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	for (const chatId of chatIds) {
		const chatResult = await invalidateChat(chatId, options)
		result.keysInvalidated += chatResult.keysInvalidated
		if (!chatResult.success) {
			result.success = false
			result.errors.push(...chatResult.errors)
		}
	}

	logInfo("Batch chat invalidation complete", {
		chatCount: chatIds.length,
		keysInvalidated: result.keysInvalidated,
	})

	return result
}

/**
 * Invalidate multiple messages in a single operation.
 *
 * @param messages - Array of message/chat ID pairs
 * @param options - Invalidation options
 * @returns Combined invalidation result
 *
 * @example
 * ```typescript
 * await invalidateMessages([
 *   { messageId: 'msg-1', chatId: 'chat-1' },
 *   { messageId: 'msg-2', chatId: 'chat-1' },
 * ]);
 * ```
 */
export async function invalidateMessages(
	messages: Array<{ messageId: string; chatId: string }>,
	options?: InvalidationOptions,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	// Group by chatId for efficient invalidation
	const byChat = new Map<string, string[]>()
	for (const { messageId, chatId } of messages) {
		const existing = byChat.get(chatId) ?? []
		existing.push(messageId)
		byChat.set(chatId, existing)
	}

	// Invalidate each chat's messages
	for (const [chatId, messageIds] of byChat) {
		// Delete individual message keys
		const keysToDelete = messageIds.map(messageKey)
		const deletedCount = await deleteKeys(keysToDelete)
		result.keysInvalidated += deletedCount

		// Invalidate chat's message list once
		if (!options?.skipCascade) {
			const patternCount = await scanAndDelete(
				chatMessagesPattern(chatId),
			)
			result.keysInvalidated += patternCount
		}
	}

	logInfo("Batch message invalidation complete", {
		messageCount: messages.length,
		keysInvalidated: result.keysInvalidated,
	})

	return result
}

// =============================================================================
// Pattern-Based Invalidation
// =============================================================================

/**
 * Invalidate all keys matching a custom pattern.
 *
 * @param pattern - Redis key pattern (e.g., "ai-assistant:v6:chat:*")
 * @returns Number of keys invalidated
 *
 * @example
 * ```typescript
 * const count = await invalidateByPattern('ai-assistant:v6:guest:*');
 * ```
 */
export async function invalidateByPattern(pattern: string): Promise<number> {
	const count = await scanAndDelete(pattern)
	logDebug("Pattern invalidation complete", { pattern, count })
	return count
}

/**
 * Invalidate all guest-related cache entries.
 *
 * @param guestId - Guest ID (format: "guest:{uuid}")
 * @returns Invalidation result
 *
 * @example
 * ```typescript
 * await invalidateGuest('guest:550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function invalidateGuest(
	guestId: string,
): Promise<InvalidationResult> {
	const result: InvalidationResult = {
		keysInvalidated: 0,
		success: true,
		errors: [],
	}

	try {
		// Pattern for all guest data
		const pattern = `${guestId}:*`
		const count = await scanAndDelete(pattern)
		result.keysInvalidated = count

		logDebug("Guest cache invalidated", {
			guestId,
			keysInvalidated: count,
		})
	} catch (error) {
		result.success = false
		result.errors.push(error as Error)
		logError("Guest invalidation failed", error as Error, { guestId })
	}

	return result
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all keys matching a pattern (for inspection/debugging).
 *
 * @param pattern - Pattern to match
 * @returns Array of matching keys
 *
 * @example
 * ```typescript
 * const keys = await getKeysByPattern('chat:123:*');
 * console.log(`Found ${keys.length} keys`);
 * ```
 */
export async function getKeysByPattern(pattern: string): Promise<string[]> {
	return scanKeys(pattern)
}

/**
 * Count keys matching a pattern.
 *
 * @param pattern - Pattern to match
 * @returns Number of matching keys
 *
 * @example
 * ```typescript
 * const count = await countKeysByPattern('user:456:*');
 * ```
 */
export async function countKeysByPattern(pattern: string): Promise<number> {
	const keys = await scanKeys(pattern)
	return keys.length
}

/**
 * Clear all cache entries (use with caution!).
 *
 * Only works in development environment for safety.
 *
 * @returns Number of keys cleared
 */
export async function clearAllCache(): Promise<number> {
	const redis = getRedisClient()

	if (!redis) {
		return 0
	}

	// Safety check - only allow in development
	if (process.env.NODE_ENV === "production") {
		logError(
			"clearAllCache called in production - operation blocked",
			new Error("Operation not allowed in production"),
		)
		return 0
	}

	try {
		// Get the prefix from the first key pattern
		const pattern = "ai-assistant:v6:*"
		const count = await scanAndDelete(pattern)

		logInfo("All cache cleared", { keysCleared: count })
		return count
	} catch (error) {
		logError("Failed to clear cache", error as Error)
		return 0
	}
}
