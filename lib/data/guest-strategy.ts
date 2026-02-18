/**
 * Guest-Aware Data Strategy
 *
 * Implements cache-only data operations for guest users.
 * Guest users do not have database persistence - all data lives in cache only.
 * On cache miss, guest operations return null instead of falling back to DB.
 *
 * @module lib/data/guest-strategy
 */

import "server-only"

import { type CacheOptions, cacheAside } from "@/lib/cache"
import { CACHE_TTL } from "@/lib/constants"
import { logDebug, logWarn } from "@/lib/log"

import type { RepositoryContext } from "./types"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for guest-aware cache operations.
 */
export interface GuestCacheOptions extends CacheOptions {
	/** Time-to-live for guest data (defaults to CACHE_TTL.guest) */
	ttl?: number
}

/**
 * Result of a guest-aware data operation.
 */
export interface GuestDataResult<T> {
	/** The data value (null if not found in cache) */
	value: T | null
	/** Whether the value came from cache */
	fromCache: boolean
	/** Whether the operation was for a guest user */
	isGuest: boolean
}

/**
 * Function type for fetching data from the database.
 */
export type DbFetcher<T> = () => Promise<T | null>

// =============================================================================
// Guest-Aware Cache Operations
// =============================================================================

/**
 * Guest-aware read-through cache pattern.
 *
 * For guest users:
 * - Only checks cache, never falls back to DB
 * - Returns null on cache miss
 *
 * For authenticated users:
 * - Uses standard cache-aside pattern
 * - Falls back to DB fetcher on cache miss
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch from database (only called for auth users)
 * @param context - Repository context with user info
 * @param options - Cache options
 * @returns The cached or fetched value, or null for guests on cache miss
 *
 * @example
 * ```typescript
 * const chat = await guestAwareGet(
 *   `chat:${chatId}`,
 *   () => db.select().from(chat).where(eq(chat.id, chatId)),
 *   { userId, isGuest: false }
 * );
 * ```
 */
export async function guestAwareGet<T>(
	key: string,
	fetcher: DbFetcher<T>,
	context: RepositoryContext,
	options?: GuestCacheOptions,
): Promise<GuestDataResult<T>> {
	// Guest users: cache-only, no DB fallback
	if (context.isGuest) {
		return guestCacheOnly(key, options)
	}

	// Authenticated users: standard cache-aside with DB fallback
	return authUserGet(key, fetcher, options)
}

/**
 * Cache-only operation for guest users.
 * Returns null on cache miss without attempting DB fetch.
 *
 * @param key - Cache key
 * @param options - Cache options
 * @returns Guest data result with value from cache or null
 */
async function guestCacheOnly<T>(
	key: string,
	options?: GuestCacheOptions,
): Promise<GuestDataResult<T>> {
	// Use cacheAside but with a fetcher that returns null
	// This ensures we check cache but don't write on miss
	const result = await cacheAside<T | null>(
		key,
		() => Promise.resolve(null),
		{
			...options,
			ttl: options?.ttl ?? CACHE_TTL.guest,
			bypass: false,
		},
	)

	// If we got a value from cache, return it
	if (result.value !== null && result.fromCache) {
		logDebug("Guest cache hit", { key, userId: "guest" })
		return {
			value: result.value,
			fromCache: true,
			isGuest: true,
		}
	}

	// Cache miss for guest - return null without DB call
	logDebug("Guest cache miss - no DB fallback", { key })
	return {
		value: null,
		fromCache: false,
		isGuest: true,
	}
}

/**
 * Standard cache-aside operation for authenticated users.
 * Falls back to database on cache miss.
 *
 * @param key - Cache key
 * @param fetcher - Database fetcher function
 * @param options - Cache options
 * @returns Data result with value from cache or database
 */
async function authUserGet<T>(
	key: string,
	fetcher: DbFetcher<T>,
	options?: GuestCacheOptions,
): Promise<GuestDataResult<T>> {
	const result = await cacheAside<T | null>(key, fetcher, {
		...options,
		ttl: options?.ttl ?? CACHE_TTL.default,
	})

	return {
		value: result.value,
		fromCache: result.fromCache,
		isGuest: false,
	}
}

/**
 * Guest-aware write operation.
 *
 * For guest users:
 * - Only writes to cache
 * - Returns the data without DB persistence
 *
 * For authenticated users:
 * - Uses write-through pattern (DB + cache)
 *
 * @param key - Cache key
 * @param data - Data to write
 * @param persister - Function to persist to database (only called for auth users)
 * @param context - Repository context with user info
 * @param options - Cache options
 * @returns The written data
 *
 * @example
 * ```typescript
 * const savedChat = await guestAwareWrite(
 *   `chat:${chatId}`,
 *   chatData,
 *   (data) => db.insert(chat).values(data).returning(),
 *   { userId, isGuest: false }
 * );
 * ```
 */
export async function guestAwareWrite<T>(
	key: string,
	data: T,
	persister: (data: T) => Promise<T>,
	context: RepositoryContext,
	options?: GuestCacheOptions,
): Promise<T> {
	// Guest users: cache-only write
	if (context.isGuest) {
		return guestCacheWrite(key, data, options)
	}

	// Authenticated users: write-through (DB + cache)
	return authUserWrite(key, data, persister, options)
}

/**
 * Cache-only write for guest users.
 * Stores data in cache without database persistence.
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 * @returns The cached data
 */
async function guestCacheWrite<T>(
	key: string,
	data: T,
	options?: GuestCacheOptions,
): Promise<T> {
	// Import setInCache directly from strategies
	const { getRedisClient, isRedisAvailable } = await import(
		"@/lib/cache/client"
	)

	if (!isRedisAvailable()) {
		logWarn("Guest write failed - cache unavailable", { key })
		return data
	}

	const redis = getRedisClient()
	if (!redis) {
		logWarn("Guest write failed - no Redis client", { key })
		return data
	}

	try {
		const serialized =
			typeof data === "string" ? data : JSON.stringify(data)
		const ttl = options?.ttl ?? CACHE_TTL.guest

		await redis.set(key, serialized, { ex: ttl })

		logDebug("Guest data cached", { key, ttl })
		return data
	} catch (error) {
		logWarn("Guest cache write failed", {
			key,
			error: (error as Error).message,
		})
		return data
	}
}

/**
 * Write-through operation for authenticated users.
 * Persists to database and updates cache.
 *
 * @param key - Cache key
 * @param data - Data to write
 * @param persister - Database persister function
 * @param options - Cache options
 * @returns The persisted data
 */
async function authUserWrite<T>(
	key: string,
	data: T,
	persister: (data: T) => Promise<T>,
	options?: GuestCacheOptions,
): Promise<T> {
	// Persist to database first (source of truth)
	const persisted = await persister(data)

	// Update cache after successful DB write using refresh pattern
	// refresh() calls the fetcher and caches the result
	const { getRedisClient, isRedisAvailable } = await import(
		"@/lib/cache/client"
	)

	if (isRedisAvailable()) {
		const redis = getRedisClient()
		if (redis) {
			try {
				const serialized =
					typeof persisted === "string"
						? persisted
						: JSON.stringify(persisted)
				await redis.set(key, serialized, {
					ex: options?.ttl ?? CACHE_TTL.default,
				})
				logDebug("Auth user data cached", { key })
			} catch (error) {
				logWarn("Cache update failed after DB write", {
					key,
					error: (error as Error).message,
				})
			}
		}
	}

	return persisted
}

/**
 * Guest-aware delete operation.
 *
 * For guest users:
 * - Only removes from cache
 *
 * For authenticated users:
 * - Deletes from database and cache
 *
 * @param key - Cache key
 * @param deleter - Function to delete from database (only called for auth users)
 * @param context - Repository context with user info
 * @returns true if deleted successfully
 */
export async function guestAwareDelete(
	key: string,
	deleter: () => Promise<boolean>,
	context: RepositoryContext,
): Promise<boolean> {
	// Guest users: cache-only delete
	if (context.isGuest) {
		return guestCacheDelete(key)
	}

	// Authenticated users: delete from DB and cache
	const dbDeleted = await deleter()

	// Also invalidate cache
	if (dbDeleted) {
		const { invalidate } = await import("@/lib/cache/strategies")
		await invalidate(key)
	}

	return dbDeleted
}

/**
 * Cache-only delete for guest users.
 *
 * @param key - Cache key
 * @returns true if deleted from cache
 */
async function guestCacheDelete(key: string): Promise<boolean> {
	const { invalidate } = await import("@/lib/cache/strategies")
	return invalidate(key)
}

/**
 * Check if a context belongs to a guest user.
 * Convenience function for repository methods.
 *
 * @param context - Repository context
 * @returns true if the context is for a guest user
 */
export function isGuestContext(
	context: RepositoryContext | undefined,
): boolean {
	return context?.isGuest ?? false
}

/**
 * Create a guest-specific cache key with user namespace.
 * Ensures guest data is isolated per-user.
 *
 * @param baseKey - Base cache key (e.g., "chat:123")
 * @param userId - Guest user ID (e.g., "guest:uuid")
 * @returns Namespaced cache key
 */
export function guestCacheKey(baseKey: string, userId: string): string {
	return `${userId}:${baseKey}`
}

// =============================================================================
// Strategy Factory
// =============================================================================

/**
 * Create a guest-aware data strategy for a specific entity type.
 * Factory function for creating consistent guest-aware operations.
 *
 * @param entityName - Name of the entity (for logging)
 * @param defaultTtl - Default TTL for cached data
 * @returns Object with guest-aware operations
 *
 * @example
 * ```typescript
 * const chatStrategy = createGuestAwareStrategy('chat', CACHE_TTL.chat);
 *
 * const chat = await chatStrategy.get(
 *   `chat:${id}`,
 *   () => fetchChatFromDb(id),
 *   context
 * );
 * ```
 */
export function createGuestAwareStrategy<T>(
	_entityName: string,
	defaultTtl: number = CACHE_TTL.default,
) {
	return {
		/**
		 * Get entity with guest-aware caching.
		 */
		async get(
			key: string,
			fetcher: DbFetcher<T>,
			context: RepositoryContext,
			options?: GuestCacheOptions,
		): Promise<GuestDataResult<T>> {
			return guestAwareGet(key, fetcher, context, {
				...options,
				ttl: options?.ttl ?? defaultTtl,
			})
		},

		/**
		 * Write entity with guest-aware persistence.
		 */
		async write(
			key: string,
			data: T,
			persister: (data: T) => Promise<T>,
			context: RepositoryContext,
			options?: GuestCacheOptions,
		): Promise<T> {
			return guestAwareWrite(key, data, persister, context, {
				...options,
				ttl: options?.ttl ?? defaultTtl,
			})
		},

		/**
		 * Delete entity with guest-aware removal.
		 */
		async delete(
			key: string,
			deleter: () => Promise<boolean>,
			context: RepositoryContext,
		): Promise<boolean> {
			return guestAwareDelete(key, deleter, context)
		},

		/**
		 * Check if context is for a guest user.
		 */
		isGuest(context: RepositoryContext | undefined): boolean {
			return isGuestContext(context)
		},
	}
}
