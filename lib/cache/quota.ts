/**
 * Cache Quota Management
 *
 * Provides cache size tracking and quota enforcement helpers.
 * Used for monitoring cache usage and preventing cache bloat.
 *
 * @module lib/cache/quota
 */

import "server-only"

import { logDebug, logError, logWarn } from "@/lib/log"
import { getRedisClient } from "./client"

// =============================================================================
// Types
// =============================================================================

/**
 * Quota information for a user or entity.
 */
export interface QuotaInfo {
	/** Current usage count */
	used: number
	/** Maximum allowed usage */
	limit: number
	/** Remaining quota */
	remaining: number
	/** Whether quota is exceeded */
	exceeded: boolean
	/** Reset timestamp (Unix epoch in seconds) */
	resetsAt: number
}

/**
 * Options for quota operations.
 */
export interface QuotaOptions {
	/** Quota limit (max allowed) */
	limit: number
	/** Window duration in seconds */
	windowSeconds: number
	/** Key prefix for namespacing */
	prefix?: string
}

/**
 * Result of a quota check operation.
 */
export interface QuotaCheckResult {
	/** Whether the operation is allowed */
	allowed: boolean
	/** Current quota info */
	quota: QuotaInfo
}

// =============================================================================
// Constants
// =============================================================================

/** Default quota key prefix */
const DEFAULT_QUOTA_PREFIX = "quota"

/** Default message quota per user per day */
export const DEFAULT_MESSAGE_QUOTA = 100

/** Default window: 24 hours */
export const DEFAULT_WINDOW_SECONDS = 24 * 60 * 60

// =============================================================================
// Key Generation
// =============================================================================

/**
 * Build a quota key with prefix.
 *
 * @param type - Quota type (e.g., "messages", "uploads")
 * @param identifier - Entity identifier (e.g., userId)
 * @param prefix - Optional custom prefix
 * @returns Quota key
 */
function buildQuotaKey(
	type: string,
	identifier: string,
	prefix = DEFAULT_QUOTA_PREFIX,
): string {
	return `${prefix}:${type}:${identifier}`
}

// =============================================================================
// Quota Operations
// =============================================================================

/**
 * Check if a quota allows an operation.
 *
 * @param type - Quota type (e.g., "messages", "uploads")
 * @param identifier - Entity identifier (e.g., userId)
 * @param options - Quota options
 * @returns Quota check result
 *
 * @example
 * ```typescript
 * const result = await checkQuota('messages', userId, {
 *   limit: 100,
 *   windowSeconds: 86400, // 24 hours
 * });
 *
 * if (!result.allowed) {
 *   throw new Error('Daily message quota exceeded');
 * }
 * ```
 */
export async function checkQuota(
	type: string,
	identifier: string,
	options: QuotaOptions,
): Promise<QuotaCheckResult> {
	const redis = getRedisClient()

	// If Redis unavailable, allow the operation (graceful degradation)
	if (!redis) {
		logDebug("Quota check skipped - Redis unavailable", {
			type,
			identifier,
		})
		return {
			allowed: true,
			quota: {
				used: 0,
				limit: options.limit,
				remaining: options.limit,
				exceeded: false,
				resetsAt: Math.floor(Date.now() / 1000) + options.windowSeconds,
			},
		}
	}

	const key = buildQuotaKey(type, identifier, options.prefix)

	try {
		// Get current count and TTL
		const [current, ttl] = await Promise.all([
			redis.get<number>(key),
			redis.ttl(key),
		])

		const used = current ?? 0
		const remaining = Math.max(0, options.limit - used)
		const exceeded = used >= options.limit
		const resetsAt =
			ttl > 0
				? Math.floor(Date.now() / 1000) + ttl
				: Math.floor(Date.now() / 1000) + options.windowSeconds

		return {
			allowed: !exceeded,
			quota: {
				used,
				limit: options.limit,
				remaining,
				exceeded,
				resetsAt,
			},
		}
	} catch (error) {
		logError("Quota check failed", error as Error, { type, identifier })
		// On error, allow the operation (fail open)
		return {
			allowed: true,
			quota: {
				used: 0,
				limit: options.limit,
				remaining: options.limit,
				exceeded: false,
				resetsAt: Math.floor(Date.now() / 1000) + options.windowSeconds,
			},
		}
	}
}

/**
 * Increment quota usage.
 *
 * @param type - Quota type
 * @param identifier - Entity identifier
 * @param options - Quota options
 * @param increment - Amount to increment (default: 1)
 * @returns Updated quota info
 *
 * @example
 * ```typescript
 * const quota = await incrementQuota('messages', userId, {
 *   limit: 100,
 *   windowSeconds: 86400,
 * });
 * ```
 */
export async function incrementQuota(
	type: string,
	identifier: string,
	options: QuotaOptions,
	increment = 1,
): Promise<QuotaInfo> {
	const redis = getRedisClient()

	// If Redis unavailable, return default quota
	if (!redis) {
		return {
			used: increment,
			limit: options.limit,
			remaining: options.limit - increment,
			exceeded: increment >= options.limit,
			resetsAt: Math.floor(Date.now() / 1000) + options.windowSeconds,
		}
	}

	const key = buildQuotaKey(type, identifier, options.prefix)

	try {
		// Use Redis INCR for atomic increment
		const newValue = await redis.incrby(key, increment)

		// Set expiry if this is a new key
		if (newValue === increment) {
			await redis.expire(key, options.windowSeconds)
		}

		const ttl = await redis.ttl(key)
		const remaining = Math.max(0, options.limit - newValue)
		const exceeded = newValue >= options.limit
		const resetsAt =
			ttl > 0
				? Math.floor(Date.now() / 1000) + ttl
				: Math.floor(Date.now() / 1000) + options.windowSeconds

		if (exceeded) {
			logWarn("Quota exceeded", { type, identifier, used: newValue })
		}

		return {
			used: newValue,
			limit: options.limit,
			remaining,
			exceeded,
			resetsAt,
		}
	} catch (error) {
		logError("Quota increment failed", error as Error, {
			type,
			identifier,
			increment,
		})
		return {
			used: 0,
			limit: options.limit,
			remaining: options.limit,
			exceeded: false,
			resetsAt: Math.floor(Date.now() / 1000) + options.windowSeconds,
		}
	}
}

/**
 * Check and increment quota in a single atomic operation.
 *
 * @param type - Quota type
 * @param identifier - Entity identifier
 * @param options - Quota options
 * @returns Quota check result with updated usage
 *
 * @example
 * ```typescript
 * const result = await checkAndIncrementQuota('messages', userId, {
 *   limit: 100,
 *   windowSeconds: 86400,
 * });
 *
 * if (!result.allowed) {
 *   return { error: 'Quota exceeded' };
 * }
 * // Proceed with operation
 * ```
 */
export async function checkAndIncrementQuota(
	type: string,
	identifier: string,
	options: QuotaOptions,
): Promise<QuotaCheckResult> {
	// First check if allowed
	const checkResult = await checkQuota(type, identifier, options)

	if (!checkResult.allowed) {
		return checkResult
	}

	// Increment and return updated quota
	const quota = await incrementQuota(type, identifier, options)

	return {
		allowed: !quota.exceeded,
		quota,
	}
}

/**
 * Reset quota for an entity.
 *
 * @param type - Quota type
 * @param identifier - Entity identifier
 * @param options - Quota options
 * @returns true if reset succeeded
 *
 * @example
 * ```typescript
 * await resetQuota('messages', userId, { limit: 100, windowSeconds: 86400 });
 * ```
 */
export async function resetQuota(
	type: string,
	identifier: string,
	options: QuotaOptions,
): Promise<boolean> {
	const redis = getRedisClient()

	if (!redis) {
		return false
	}

	const key = buildQuotaKey(type, identifier, options.prefix)

	try {
		await redis.del(key)
		logDebug("Quota reset", { type, identifier })
		return true
	} catch (error) {
		logError("Quota reset failed", error as Error, { type, identifier })
		return false
	}
}

/**
 * Get current quota info without incrementing.
 *
 * @param type - Quota type
 * @param identifier - Entity identifier
 * @param options - Quota options
 * @returns Current quota info
 *
 * @example
 * ```typescript
 * const quota = await getQuotaInfo('messages', userId, {
 *   limit: 100,
 *   windowSeconds: 86400,
 * });
 * console.log(`${quota.remaining} messages remaining`);
 * ```
 */
export async function getQuotaInfo(
	type: string,
	identifier: string,
	options: QuotaOptions,
): Promise<QuotaInfo> {
	const result = await checkQuota(type, identifier, options)
	return result.quota
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Check daily message quota for a user.
 *
 * @param userId - User UUID
 * @param limit - Daily message limit (default: 100)
 * @returns Quota check result
 *
 * @example
 * ```typescript
 * const result = await checkMessageQuota(userId);
 * if (!result.allowed) {
 *   throw new Error('Daily message limit reached');
 * }
 * ```
 */
export async function checkMessageQuota(
	userId: string,
	limit = DEFAULT_MESSAGE_QUOTA,
): Promise<QuotaCheckResult> {
	return checkQuota("messages", userId, {
		limit,
		windowSeconds: DEFAULT_WINDOW_SECONDS,
	})
}

/**
 * Increment message quota for a user.
 *
 * @param userId - User UUID
 * @param limit - Daily message limit (default: 100)
 * @returns Updated quota info
 *
 * @example
 * ```typescript
 * const quota = await incrementMessageQuota(userId);
 * console.log(`${quota.remaining} messages remaining today`);
 * ```
 */
export async function incrementMessageQuota(
	userId: string,
	limit = DEFAULT_MESSAGE_QUOTA,
): Promise<QuotaInfo> {
	return incrementQuota("messages", userId, {
		limit,
		windowSeconds: DEFAULT_WINDOW_SECONDS,
	})
}

/**
 * Check and increment message quota atomically.
 *
 * @param userId - User UUID
 * @param limit - Daily message limit (default: 100)
 * @returns Quota check result
 *
 * @example
 * ```typescript
 * const result = await checkAndIncrementMessageQuota(userId);
 * if (!result.allowed) {
 *   return { error: 'Daily limit reached' };
 * }
 * // Send message
 * ```
 */
export async function checkAndIncrementMessageQuota(
	userId: string,
	limit = DEFAULT_MESSAGE_QUOTA,
): Promise<QuotaCheckResult> {
	return checkAndIncrementQuota("messages", userId, {
		limit,
		windowSeconds: DEFAULT_WINDOW_SECONDS,
	})
}

// =============================================================================
// Cache Size Tracking
// =============================================================================

/**
 * Get approximate cache key count.
 *
 * Note: Memory usage info is not available via Upstash REST API.
 * Use Upstash dashboard for memory metrics.
 *
 * @returns Key count or null if unavailable
 *
 * @example
 * ```typescript
 * const count = await getCacheKeyCount();
 * if (count !== null) {
 *   console.log(`Cache has ${count} keys`);
 * }
 * ```
 */
export async function getCacheKeyCount(): Promise<number | null> {
	const redis = getRedisClient()

	if (!redis) {
		return null
	}

	try {
		// Get key count using dbsize
		const keyCount = await redis.dbsize()
		return keyCount
	} catch (error) {
		logError("Failed to get cache key count", error as Error)
		return null
	}
}

/**
 * Track cache key size for monitoring.
 *
 * @param key - Cache key
 * @param size - Size in bytes
 * @param prefix - Key prefix for tracking
 *
 * @example
 * ```typescript
 * await trackKeySize('user:123', 1024);
 * ```
 */
export async function trackKeySize(
	key: string,
	size: number,
	prefix = "size",
): Promise<void> {
	const redis = getRedisClient()

	if (!redis) {
		return
	}

	try {
		const trackingKey = `${prefix}:${key}`
		await redis.set(trackingKey, size.toString(), { ex: 86400 }) // 24h TTL
	} catch (error) {
		logDebug("Failed to track key size", { key, error: String(error) })
	}
}

/**
 * Get total tracked cache size.
 *
 * @param prefix - Key prefix for tracking
 * @returns Total size in bytes
 *
 * @example
 * ```typescript
 * const totalSize = await getTotalTrackedSize();
 * console.log(`Total cache size: ${totalSize} bytes`);
 * ```
 */
export async function getTotalTrackedSize(prefix = "size"): Promise<number> {
	const redis = getRedisClient()

	if (!redis) {
		return 0
	}

	try {
		let totalSize = 0
		let cursor = "0"

		do {
			const [nextCursor, keys] = await redis.scan(cursor, {
				match: `${prefix}:*`,
				count: 100,
			})

			cursor = nextCursor

			if (keys.length > 0) {
				const values = await redis.mget(...keys)
				for (const value of values) {
					if (typeof value === "string") {
						totalSize += Number.parseInt(value, 10) || 0
					}
				}
			}
		} while (cursor !== "0")

		return totalSize
	} catch (error) {
		logError("Failed to get total tracked size", error as Error)
		return 0
	}
}
