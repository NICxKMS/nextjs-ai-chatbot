/**
 * Tiered Cache
 *
 * Two-tier cache implementation with L1 (Memory/LRU) → L2 (Redis) fallthrough.
 * Provides automatic promotion from L2 to L1 on hit, and graceful degradation
 * when Redis is unavailable.
 *
 * Features:
 * - L1: In-memory LRU cache (fast, small, process-local)
 * - L2: Redis cache (slower, larger, shared across processes)
 * - Automatic L1 promotion on L2 hit
 * - Stats tracking across both tiers
 * - Graceful degradation when Redis unavailable
 * - Cache warming utilities
 *
 * @module lib/cache/tiered-cache
 */

import "server-only"

import { CACHE_TTL } from "@/lib/constants"
import { logDebug, logError, logWarn } from "@/lib/log"
import {
	isCircuitOpen,
	recordCacheFailure,
	recordCacheSuccess,
} from "./circuit-breaker"
import { getRedisClient, isRedisAvailable } from "./client"
import {
	LRUCache,
	type LRUCacheOptions,
	type LRUCacheStats,
} from "./memory-cache"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a tiered cache.
 */
export interface TieredCacheOptions {
	/** L1 (memory) cache options */
	l1Options?: LRUCacheOptions
	/** TTL for L1 cache in seconds (default: 60, shorter than L2) */
	l1Ttl?: number
	/** TTL for L2 (Redis) cache in seconds (default: from CACHE_TTL.default) */
	l2Ttl?: number
}

/**
 * Statistics for the tiered cache.
 */
export interface TieredCacheStats {
	/** L1 (memory) cache stats */
	l1: LRUCacheStats
	/** L2 (Redis) cache stats */
	l2: {
		/** Number of cache hits */
		hits: number
		/** Number of cache misses */
		misses: number
		/** Number of errors */
		errors: number
		/** Whether Redis is available */
		available: boolean
	}
	/** Total hits across both tiers */
	totalHits: number
	/** Total misses across both tiers */
	totalMisses: number
	/** Hit rate (0-1) */
	hitRate: number
}

/**
 * Options for tiered cache operations.
 */
export interface TieredCacheSetOptions {
	/** TTL in seconds (applied to both L1 and L2) */
	ttl?: number | undefined
	/** Skip L1 cache (only write to L2) */
	skipL1?: boolean
	/** Skip L2 cache (only write to L1) */
	skipL2?: boolean
}

/**
 * Result of a tiered cache get operation.
 */
export interface TieredCacheResult<T> {
	/** The cached value or undefined if not found */
	value: T | undefined
	/** Which tier the value came from */
	source: "l1" | "l2" | "miss"
	/** Whether the value was found */
	found: boolean
}

/**
 * Function type for cache warming fetcher.
 */
export type WarmFetcher<T> = (key: string) => Promise<T | undefined>

// =============================================================================
// Tiered Cache Implementation
// =============================================================================

/**
 * Tiered cache with L1 (Memory) → L2 (Redis) fallthrough.
 *
 * @typeParam T - Default type of values stored in the cache
 *
 * @example
 * ```typescript
 * const cache = new TieredCache({
 *   l1Options: { maxSize: 500 },
 *   l1Ttl: 60,    // 1 minute in L1
 *   l2Ttl: 3600,  // 1 hour in L2
 * });
 *
 * // Set value (writes to both tiers)
 * await cache.set('user:123', { name: 'John' });
 *
 * // Get value (checks L1 first, then L2, promotes on L2 hit)
 * const result = await cache.get('user:123');
 *
 * // Delete from both tiers
 * await cache.delete('user:123');
 * ```
 */
export class TieredCache<T = unknown> {
	/** L1 in-memory cache */
	private readonly l1: LRUCache<T>

	/** L1 TTL in seconds */
	private readonly l1Ttl: number

	/** L2 TTL in seconds */
	private readonly l2Ttl: number

	/** L2 stats tracking */
	private l2Hits = 0
	private l2Misses = 0
	private l2Errors = 0

	/**
	 * Create a new tiered cache.
	 *
	 * @param options - Cache configuration options
	 */
	constructor(options: TieredCacheOptions = {}) {
		this.l1 = new LRUCache<T>(options.l1Options)
		this.l1Ttl = options.l1Ttl ?? 60 // Default: 1 minute for L1
		this.l2Ttl = options.l2Ttl ?? CACHE_TTL.default
	}

	/**
	 * Get a value from the cache.
	 *
	 * Checks L1 first, then L2. On L2 hit, promotes the value to L1.
	 *
	 * @param key - Cache key
	 * @returns Cache result with value and source information
	 */
	async get(key: string): Promise<TieredCacheResult<T>> {
		// Check L1 first
		const l1Value = this.l1.get(key)
		if (l1Value !== undefined) {
			return { value: l1Value, source: "l1", found: true }
		}

		// Check L2 (Redis)
		if (isCircuitOpen()) {
			this.l2Misses++
			logWarn("Tiered cache L2 skipped - circuit breaker open", { key })
			return { value: undefined, source: "miss", found: false }
		}

		const redis = getRedisClient()
		if (!redis) {
			this.l2Misses++
			return { value: undefined, source: "miss", found: false }
		}

		try {
			const cached = await redis.get<string>(key)

			if (cached === null) {
				this.l2Misses++
				recordCacheSuccess()
				return { value: undefined, source: "miss", found: false }
			}

			// Parse JSON if the value is a string that looks like JSON
			let value: T
			if (typeof cached === "string") {
				try {
					value = JSON.parse(cached) as T
				} catch {
					value = cached as unknown as T
				}
			} else {
				value = cached as T
			}

			this.l2Hits++
			recordCacheSuccess()

			// Promote to L1 with L1 TTL
			this.l1.set(key, value, { ttl: this.l1Ttl })

			logDebug("Tiered cache L2 hit, promoted to L1", { key })

			return { value, source: "l2", found: true }
		} catch (error) {
			this.l2Errors++
			recordCacheFailure("get", error)
			logError("Tiered cache L2 get error", error as Error, { key })
			return { value: undefined, source: "miss", found: false }
		}
	}

	/**
	 * Set a value in the cache.
	 *
	 * Writes to both L1 and L2 by default.
	 *
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param options - Set options including TTL
	 */
	async set(
		key: string,
		value: T,
		options?: TieredCacheSetOptions,
	): Promise<void> {
		const ttl = options?.ttl ?? this.l2Ttl
		const l1Ttl = Math.min(ttl, this.l1Ttl)

		// Write to L1 (unless skipped)
		if (!options?.skipL1) {
			this.l1.set(key, value, { ttl: l1Ttl })
		}

		// Write to L2 (unless skipped or Redis unavailable)
		if (!options?.skipL2) {
			if (isCircuitOpen()) {
				logWarn("Tiered cache L2 set skipped - circuit breaker open", {
					key,
				})
				return
			}

			const redis = getRedisClient()
			if (redis) {
				try {
					const serialized =
						typeof value === "string"
							? value
							: JSON.stringify(value)
					await redis.set(key, serialized, { ex: ttl })
					recordCacheSuccess()
					logDebug("Tiered cache set", { key, ttl })
				} catch (error) {
					this.l2Errors++
					recordCacheFailure("set", error)
					logError("Tiered cache L2 set error", error as Error, {
						key,
					})
				}
			}
		}
	}

	/**
	 * Delete a value from the cache.
	 *
	 * Removes from both L1 and L2.
	 *
	 * @param key - Cache key
	 * @returns true if deleted from any tier
	 */
	async delete(key: string): Promise<boolean> {
		// Delete from L1
		const l1Deleted = this.l1.delete(key)

		// Delete from L2
		let l2Deleted = false
		if (isCircuitOpen()) {
			logWarn("Tiered cache L2 delete skipped - circuit breaker open", {
				key,
			})
			return l1Deleted
		}

		const redis = getRedisClient()
		if (redis) {
			try {
				await redis.del(key)
				l2Deleted = true
				recordCacheSuccess()
				logDebug("Tiered cache delete", { key })
			} catch (error) {
				this.l2Errors++
				recordCacheFailure("delete", error)
				logError("Tiered cache L2 delete error", error as Error, {
					key,
				})
			}
		}

		return l1Deleted || l2Deleted
	}

	/**
	 * Check if a key exists in the cache.
	 *
	 * Checks L1 first, then L2.
	 *
	 * @param key - Cache key
	 * @returns true if key exists in any tier
	 */
	async has(key: string): Promise<boolean> {
		// Check L1 first
		if (this.l1.has(key)) {
			return true
		}

		// Check L2
		if (isCircuitOpen()) {
			logWarn("Tiered cache L2 has skipped - circuit breaker open", {
				key,
			})
			return false
		}

		const redis = getRedisClient()
		if (!redis) {
			return false
		}

		try {
			const exists = await redis.exists(key)
			recordCacheSuccess()
			return exists === 1
		} catch (error) {
			this.l2Errors++
			recordCacheFailure("exists", error)
			logError("Tiered cache L2 has error", error as Error, { key })
			return false
		}
	}

	/**
	 * Clear the L1 cache.
	 *
	 * Note: This only clears L1 (memory). L2 (Redis) must be cleared
	 * separately using pattern-based deletion if needed.
	 */
	clear(): void {
		this.l1.clear()
		logDebug("Tiered cache L1 cleared")
	}

	/**
	 * Get cache statistics.
	 */
	get stats(): TieredCacheStats {
		const l1Stats = this.l1.stats
		const totalHits = l1Stats.hits + this.l2Hits
		const totalMisses = l1Stats.misses + this.l2Misses
		const totalRequests = totalHits + totalMisses

		return {
			l1: l1Stats,
			l2: {
				hits: this.l2Hits,
				misses: this.l2Misses,
				errors: this.l2Errors,
				available: isRedisAvailable(),
			},
			totalHits,
			totalMisses,
			hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
		}
	}

	/**
	 * Reset statistics counters.
	 */
	resetStats(): void {
		this.l1.resetStats()
		this.l2Hits = 0
		this.l2Misses = 0
		this.l2Errors = 0
	}

	/**
	 * Get the L1 cache size.
	 */
	get size(): number {
		return this.l1.size
	}

	/**
	 * Get the L1 cache max size.
	 */
	get maxSize(): number {
		return this.l1.maxSize
	}
}

// =============================================================================
// Default Instance & Factory
// =============================================================================

/**
 * Create a new tiered cache instance.
 *
 * @param options - Cache configuration options
 * @returns New tiered cache instance
 *
 * @example
 * ```typescript
 * const cache = createTieredCache({
 *   l1Options: { maxSize: 500 },
 *   l1Ttl: 60,
 *   l2Ttl: 3600,
 * });
 * ```
 */
export function createTieredCache<T = unknown>(
	options?: TieredCacheOptions,
): TieredCache<T> {
	return new TieredCache<T>(options)
}

/**
 * Default tiered cache instance for general use.
 * Configured with default settings (1000 items in L1, 60s L1 TTL, default L2 TTL).
 */
export const defaultTieredCache = new TieredCache()

// =============================================================================
// Cache Warming Utilities
// =============================================================================

/**
 * Warm the cache by pre-populating it with data.
 *
 * @param cache - Tiered cache instance
 * @param keys - Array of cache keys to warm
 * @param fetcher - Function to fetch data for each key
 * @param options - Warming options
 * @returns Number of keys successfully warmed
 *
 * @example
 * ```typescript
 * const warmed = await warmCache(cache, ['user:1', 'user:2'], async (key) => {
 *   const id = key.split(':')[1];
 *   return await db.select().from(users).where(eq(users.id, id));
 * });
 * console.log(`Warmed ${warmed} keys`);
 * ```
 */
export async function warmCache<T>(
	cache: TieredCache<T>,
	keys: string[],
	fetcher: WarmFetcher<T>,
	options?: { ttl?: number; concurrency?: number },
): Promise<number> {
	const concurrency = options?.concurrency ?? 5
	const ttl = options?.ttl

	let warmed = 0
	const errors: Array<{ key: string; error: Error }> = []

	// Process in batches for concurrency control
	for (let i = 0; i < keys.length; i += concurrency) {
		const batch = keys.slice(i, i + concurrency)

		const results = await Promise.allSettled(
			batch.map(async (key) => {
				// Check if already cached
				const existing = await cache.get(key)
				if (existing.found) {
					return { key, cached: true }
				}

				// Fetch and cache
				const value = await fetcher(key)
				if (value !== undefined) {
					await cache.set(key, value, { ttl })
					return { key, cached: false }
				}
				return { key, cached: false, skipped: true }
			}),
		)

		for (const result of results) {
			if (result.status === "fulfilled") {
				if (!result.value.skipped) {
					warmed++
				}
			} else {
				const keyIndex = results.indexOf(result)
				const key = batch[keyIndex] ?? "unknown"
				errors.push({ key, error: result.reason })
				logWarn("Cache warming failed for key", {
					key,
					error: result.reason,
				})
			}
		}
	}

	if (errors.length > 0) {
		logWarn("Cache warming completed with errors", {
			warmed,
			errors: errors.length,
		})
	} else {
		logDebug("Cache warming completed", { warmed, total: keys.length })
	}

	return warmed
}

/**
 * Warm the cache with key-value pairs.
 *
 * @param cache - Tiered cache instance
 * @param entries - Array of key-value pairs to warm
 * @param options - Warming options
 * @returns Number of keys warmed
 *
 * @example
 * ```typescript
 * await warmCacheWithEntries(cache, [
 *   { key: 'user:1', value: { name: 'John' } },
 *   { key: 'user:2', value: { name: 'Jane' } },
 * ], { ttl: 3600 });
 * ```
 */
export async function warmCacheWithEntries<T>(
	cache: TieredCache<T>,
	entries: Array<{ key: string; value: T }>,
	options?: { ttl?: number; concurrency?: number },
): Promise<number> {
	const concurrency = options?.concurrency ?? 10
	const ttl = options?.ttl

	let warmed = 0

	// Process in batches for concurrency control
	for (let i = 0; i < entries.length; i += concurrency) {
		const batch = entries.slice(i, i + concurrency)

		await Promise.all(
			batch.map(async ({ key, value }) => {
				await cache.set(key, value, { ttl })
				warmed++
			}),
		)
	}

	logDebug("Cache warming with entries completed", { warmed })

	return warmed
}

/**
 * Create a cache warmer function for a specific fetcher.
 *
 * Useful for creating reusable warming functions for specific data types.
 *
 * @param cache - Tiered cache instance
 * @param fetcher - Function to fetch data for each key
 * @returns Warming function
 *
 * @example
 * ```typescript
 * const warmUsers = createCacheWarmer(cache, async (key) => {
 *   const id = key.split(':')[1];
 *   return await getUserById(id);
 * });
 *
 * // Later, warm specific users
 * await warmUsers(['user:1', 'user:2', 'user:3']);
 * ```
 */
export function createCacheWarmer<T>(
	cache: TieredCache<T>,
	fetcher: WarmFetcher<T>,
): (keys: string[], options?: { ttl?: number }) => Promise<number> {
	return (keys, options) => warmCache(cache, keys, fetcher, options)
}
