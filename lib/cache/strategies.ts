/**
 * Cache Strategies
 *
 * Implements caching patterns: read-through, cache-aside, write-through, and write-behind.
 * All strategies handle Redis unavailability gracefully by falling back to the fetcher/writer.
 *
 * @module lib/cache/strategies
 */

import "server-only"

import { CACHE_TTL } from "@/lib/constants"
import { logDebug, logError, logWarn } from "@/lib/log"
import { getRedisClient, isRedisAvailable } from "./client"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for cache operations.
 */
export interface CacheOptions {
	/** Time-to-live in seconds */
	ttl?: number
	/** Skip cache and force fetch from source */
	bypass?: boolean
	/** Tags for grouping related cache entries */
	tags?: string[]
}

/**
 * Result of a cache operation with metadata.
 */
export interface CacheResult<T> {
	/** The cached or fetched value */
	value: T
	/** Whether the value came from cache */
	fromCache: boolean
	/** Whether cache is available */
	cacheAvailable: boolean
}

/**
 * Function type for fetching data from the source.
 */
export type Fetcher<T> = () => Promise<T>

/**
 * Function type for persisting data to the source.
 */
export type Persister<T> = (data: T) => Promise<T>

// =============================================================================
// Metrics Tracking (Internal)
// =============================================================================

interface CacheMetrics {
	hits: number
	misses: number
	errors: number
}

const metrics: CacheMetrics = {
	hits: 0,
	misses: 0,
	errors: 0,
}

/**
 * Get current cache metrics.
 * Useful for monitoring and debugging.
 */
export function getCacheMetrics(): Readonly<CacheMetrics> {
	return { ...metrics }
}

/**
 * Reset cache metrics.
 */
export function resetCacheMetrics(): void {
	metrics.hits = 0
	metrics.misses = 0
	metrics.errors = 0
}

// =============================================================================
// Core Cache Operations
// =============================================================================

/**
 * Get a value from cache.
 *
 * @param key - Cache key
 * @returns Cached value or null if not found
 */
async function getFromCache<T>(key: string): Promise<T | null> {
	const redis = getRedisClient()

	if (!redis) {
		return null
	}

	try {
		const cached = await redis.get<string>(key)

		if (cached === null) {
			return null
		}

		// Parse JSON if the value is a string that looks like JSON
		if (typeof cached === "string") {
			try {
				return JSON.parse(cached) as T
			} catch {
				// Not JSON, return as-is
				return cached as unknown as T
			}
		}

		return cached as T
	} catch (error) {
		metrics.errors++
		logError("Cache get error", error as Error, { key })
		return null
	}
}

/**
 * Set a value in cache with optional TTL.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time-to-live in seconds
 */
async function setInCache<T>(
	key: string,
	value: T,
	ttl?: number,
): Promise<boolean> {
	const redis = getRedisClient()

	if (!redis) {
		return false
	}

	try {
		const serialized =
			typeof value === "string" ? value : JSON.stringify(value)
		const effectiveTtl = ttl ?? CACHE_TTL.default

		await redis.set(key, serialized, { ex: effectiveTtl })

		logDebug("Cache set", { key, ttl: effectiveTtl })
		return true
	} catch (error) {
		metrics.errors++
		logError("Cache set error", error as Error, { key })
		return false
	}
}

/**
 * Delete a value from cache.
 *
 * @param key - Cache key
 * @returns true if deleted, false otherwise
 */
async function deleteFromCache(key: string): Promise<boolean> {
	const redis = getRedisClient()

	if (!redis) {
		return false
	}

	try {
		await redis.del(key)
		logDebug("Cache delete", { key })
		return true
	} catch (error) {
		metrics.errors++
		logError("Cache delete error", error as Error, { key })
		return false
	}
}

// =============================================================================
// Cache Strategies
// =============================================================================

/**
 * Read-through cache pattern (also known as cache-aside read).
 *
 * Attempts to read from cache first. On cache miss, fetches from source,
 * stores in cache, and returns the value.
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch data from source on cache miss
 * @param options - Cache options (ttl, bypass)
 * @returns The cached or fetched value
 *
 * @example
 * ```typescript
 * const user = await cacheThrough(
 *   `user:${userId}`,
 *   () => db.select().from(users).where(eq(users.id, userId)),
 *   { ttl: CACHE_TTL.user }
 * );
 * ```
 */
export async function cacheThrough<T>(
	key: string,
	fetcher: Fetcher<T>,
	options?: CacheOptions,
): Promise<T> {
	// Bypass cache if requested
	if (options?.bypass) {
		logDebug("Cache bypass", { key })
		return fetcher()
	}

	// Try cache first
	const cached = await getFromCache<T>(key)

	if (cached !== null) {
		metrics.hits++
		logDebug("Cache hit", { key })
		return cached
	}

	// Cache miss - fetch from source
	metrics.misses++
	logDebug("Cache miss", { key })

	const value = await fetcher()

	// Store in cache (fire-and-forget, don't block on errors)
	void setInCache(key, value, options?.ttl).catch((error) => {
		logWarn("Failed to cache value", { key, error: error.message })
	})

	return value
}

/**
 * Cache-aside pattern (lazy loading).
 *
 * Similar to read-through but returns additional metadata about the cache operation.
 * The caller is responsible for explicitly updating the cache when data changes.
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch data from source on cache miss
 * @param options - Cache options (ttl, bypass)
 * @returns Cache result with value and metadata
 *
 * @example
 * ```typescript
 * const result = await cacheAside(
 *   `chat:${chatId}`,
 *   () => getChatFromDb(chatId),
 *   { ttl: CACHE_TTL.chat }
 * );
 *
 * if (result.fromCache) {
 *   console.log('Served from cache');
 * }
 * ```
 */
export async function cacheAside<T>(
	key: string,
	fetcher: Fetcher<T>,
	options?: CacheOptions,
): Promise<CacheResult<T>> {
	const cacheAvailable = isRedisAvailable()

	// Bypass cache if requested or cache unavailable
	if (options?.bypass || !cacheAvailable) {
		const value = await fetcher()
		return {
			value,
			fromCache: false,
			cacheAvailable,
		}
	}

	// Try cache first
	const cached = await getFromCache<T>(key)

	if (cached !== null) {
		metrics.hits++
		logDebug("Cache hit (aside)", { key })
		return {
			value: cached,
			fromCache: true,
			cacheAvailable,
		}
	}

	// Cache miss - fetch from source
	metrics.misses++
	logDebug("Cache miss (aside)", { key })

	const value = await fetcher()

	// Store in cache
	void setInCache(key, value, options?.ttl).catch((error) => {
		logWarn("Failed to cache value (aside)", { key, error: error.message })
	})

	return {
		value,
		fromCache: false,
		cacheAvailable,
	}
}

/**
 * Write-through cache pattern.
 *
 * Writes data to both cache and source store atomically.
 * Returns the written value after successful persistence.
 *
 * @param key - Cache key
 * @param data - Data to write
 * @param persister - Function to persist data to source
 * @param options - Cache options (ttl)
 * @returns The persisted value
 *
 * @example
 * ```typescript
 * const savedMessage = await writeThrough(
 *   `message:${messageId}`,
 *   messageData,
 *   (data) => db.insert(messages).values(data).returning(),
 *   { ttl: CACHE_TTL.message }
 * );
 * ```
 */
export async function writeThrough<T>(
	key: string,
	data: T,
	persister: Persister<T>,
	options?: CacheOptions,
): Promise<T> {
	// Persist to source first (source of truth)
	const persisted = await persister(data)

	// Update cache after successful persist
	if (isRedisAvailable()) {
		void setInCache(key, persisted, options?.ttl).catch((error) => {
			logWarn("Failed to update cache (write-through)", {
				key,
				error: error.message,
			})
		})
	}

	return persisted
}

/**
 * Write-behind cache pattern (write-back).
 *
 * Writes to cache immediately and persists to source asynchronously.
 * Provides low-latency writes at the cost of potential data loss on failure.
 *
 * @param key - Cache key
 * @param data - Data to write
 * @param persister - Function to persist data to source
 * @param options - Cache options (ttl)
 * @returns The data written to cache (not yet persisted)
 *
 * @example
 * ```typescript
 * // Fast write - returns immediately
 * const message = await writeBehind(
 *   `message:${messageId}`,
 *   messageData,
 *   (data) => db.insert(messages).values(data).returning(),
 *   { ttl: CACHE_TTL.message }
 * );
 *
 * // Data is persisted asynchronously in the background
 * ```
 */
export async function writeBehind<T>(
	key: string,
	data: T,
	persister: Persister<T>,
	options?: CacheOptions,
): Promise<T> {
	// Update cache immediately
	if (isRedisAvailable()) {
		await setInCache(key, data, options?.ttl)
	}

	// Persist asynchronously in the background
	void persister(data).catch((error) => {
		logError("Write-behind persistence failed", error as Error, { key })
		// Note: In production, you might want to add retry logic or queue
	})

	return data
}

/**
 * Invalidate a cache entry.
 *
 * @param key - Cache key to invalidate
 * @returns true if invalidation succeeded
 *
 * @example
 * ```typescript
 * await invalidate(`user:${userId}`);
 * ```
 */
export async function invalidate(key: string): Promise<boolean> {
	return deleteFromCache(key)
}

/**
 * Invalidate multiple cache entries matching a pattern.
 *
 * Uses Redis SCAN for safe pattern matching (not KEYS).
 *
 * @param pattern - Pattern to match (e.g., "user:*")
 * @returns Number of keys invalidated
 *
 * @example
 * ```typescript
 * const count = await invalidatePattern('chat:123:*');
 * console.log(`Invalidated ${count} keys`);
 * ```
 */
export async function invalidatePattern(pattern: string): Promise<number> {
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

		logDebug("Pattern invalidation complete", { pattern, count })
		return count
	} catch (error) {
		metrics.errors++
		logError("Pattern invalidation error", error as Error, { pattern })
		return 0
	}
}

/**
 * Refresh a cache entry.
 *
 * Forces a fetch from source and updates the cache.
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch fresh data
 * @param options - Cache options (ttl)
 * @returns The fresh value
 *
 * @example
 * ```typescript
 * const freshUser = await refresh(
 *   `user:${userId}`,
 *   () => db.select().from(users).where(eq(users.id, userId)),
 *   { ttl: CACHE_TTL.user }
 * );
 * ```
 */
export async function refresh<T>(
	key: string,
	fetcher: Fetcher<T>,
	options?: CacheOptions,
): Promise<T> {
	// Fetch fresh data
	const value = await fetcher()

	// Update cache
	await setInCache(key, value, options?.ttl)

	return value
}

/**
 * Get or set a cache value.
 *
 * Convenience function that combines get and set operations.
 * If the key exists, returns the cached value.
 * If not, calls the fetcher, caches the result, and returns it.
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch data if not cached
 * @param options - Cache options
 * @returns The cached or fetched value
 */
export async function getOrSet<T>(
	key: string,
	fetcher: Fetcher<T>,
	options?: CacheOptions,
): Promise<T> {
	return cacheThrough(key, fetcher, options)
}
