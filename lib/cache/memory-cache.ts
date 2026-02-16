/**
 * In-Memory LRU Cache
 *
 * Provides an in-memory LRU (Least Recently Used) cache for ultra-hot data.
 * This serves as the L1 cache layer in the tiered caching strategy.
 *
 * Features:
 * - LRU eviction policy with configurable max size
 * - TTL (Time-To-Live) support per item
 * - O(1) get, set, delete operations using Map + doubly-linked list
 * - Stats tracking (hits, misses, evictions)
 * - Iterators for keys and values
 *
 * @module lib/cache/memory-cache
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Cache entry stored in the LRU cache.
 */
interface CacheEntry<T> {
	/** The cached value */
	value: T
	/** Expiration timestamp in milliseconds (0 = no expiration) */
	expiresAt: number
	/** Key for reverse lookup during eviction */
	key: string
}

/**
 * Statistics for the LRU cache.
 */
export interface LRUCacheStats {
	/** Number of cache hits */
	hits: number
	/** Number of cache misses */
	misses: number
	/** Number of entries evicted due to size limit */
	evictions: number
	/** Current number of entries in cache */
	size: number
	/** Maximum capacity of the cache */
	maxSize: number
}

/**
 * Options for creating an LRU cache.
 */
export interface LRUCacheOptions {
	/** Maximum number of items to store (default: 1000) */
	maxSize?: number
	/** Default TTL in seconds for entries without explicit TTL */
	defaultTtl?: number
}

/**
 * Options for setting a cache entry.
 */
export interface SetOptions {
	/** Time-to-live in seconds */
	ttl?: number
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * LRU (Least Recently Used) Cache implementation.
 *
 * Uses a Map for O(1) lookups and maintains access order for LRU eviction.
 * The Map in JavaScript maintains insertion order, and we re-insert on access
 * to maintain LRU order (oldest first, most recently used last).
 *
 * @typeParam T - The type of values stored in the cache
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string>({ maxSize: 100 });
 *
 * cache.set('key1', 'value1', { ttl: 60 }); // 60 second TTL
 * cache.set('key2', 'value2'); // No TTL (uses default)
 *
 * const value = cache.get('key1'); // 'value1'
 * const peeked = cache.peek('key2'); // 'value2' (doesn't update LRU order)
 *
 * console.log(cache.stats); // { hits: 1, misses: 0, evictions: 0, ... }
 * ```
 */
export class LRUCache<T = unknown> {
	/** Internal Map storing cache entries */
	private readonly cache: Map<string, CacheEntry<T>> = new Map()

	/** Maximum number of items in the cache */
	private readonly _maxSize: number

	/** Default TTL in milliseconds (0 = no expiration) */
	private readonly _defaultTtlMs: number

	/** Statistics counters */
	private _hits = 0
	private _misses = 0
	private _evictions = 0

	/**
	 * Create a new LRU cache.
	 *
	 * @param options - Cache configuration options
	 */
	constructor(options: LRUCacheOptions = {}) {
		this._maxSize = options.maxSize ?? 1000
		this._defaultTtlMs = (options.defaultTtl ?? 0) * 1000
	}

	/**
	 * Get the maximum capacity of the cache.
	 */
	get maxSize(): number {
		return this._maxSize
	}

	/**
	 * Get the current number of entries in the cache.
	 */
	get size(): number {
		return this.cache.size
	}

	/**
	 * Get cache statistics.
	 */
	get stats(): LRUCacheStats {
		return {
			hits: this._hits,
			misses: this._misses,
			evictions: this._evictions,
			size: this.cache.size,
			maxSize: this._maxSize,
		}
	}

	/**
	 * Get a value from the cache.
	 * Updates the LRU order (moves to most recently used).
	 *
	 * @param key - Cache key
	 * @returns The cached value or undefined if not found/expired
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key)

		if (!entry) {
			this._misses++
			return undefined
		}

		// Check if expired
		if (this.isExpired(entry)) {
			this.cache.delete(key)
			this._misses++
			return undefined
		}

		// Update LRU order by re-inserting at the end
		this.cache.delete(key)
		this.cache.set(key, entry)

		this._hits++
		return entry.value
	}

	/**
	 * Get a value from the cache without updating LRU order.
	 * Useful for checking existence or peeking at values.
	 *
	 * @param key - Cache key
	 * @returns The cached value or undefined if not found/expired
	 */
	peek(key: string): T | undefined {
		const entry = this.cache.get(key)

		if (!entry) {
			return undefined
		}

		// Check if expired
		if (this.isExpired(entry)) {
			this.cache.delete(key)
			return undefined
		}

		return entry.value
	}

	/**
	 * Set a value in the cache.
	 * If the cache is full, evicts the least recently used entry.
	 *
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param options - Set options including TTL
	 */
	set(key: string, value: T, options?: SetOptions): void {
		// Calculate expiration time
		const ttlMs =
			options?.ttl !== undefined ? options.ttl * 1000 : this._defaultTtlMs
		const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0

		// If key exists, delete it first to update LRU order
		if (this.cache.has(key)) {
			this.cache.delete(key)
		} else if (this.cache.size >= this._maxSize) {
			// Evict least recently used (first entry in Map)
			this.evictLRU()
		}

		// Add new entry at the end (most recently used)
		this.cache.set(key, {
			value,
			expiresAt,
			key,
		})
	}

	/**
	 * Check if a key exists in the cache.
	 * Does not update LRU order.
	 *
	 * @param key - Cache key
	 * @returns true if key exists and is not expired
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key)

		if (!entry) {
			return false
		}

		// Check if expired
		if (this.isExpired(entry)) {
			this.cache.delete(key)
			return false
		}

		return true
	}

	/**
	 * Delete a key from the cache.
	 *
	 * @param key - Cache key
	 * @returns true if the key was deleted, false if it didn't exist
	 */
	delete(key: string): boolean {
		return this.cache.delete(key)
	}

	/**
	 * Clear all entries from the cache.
	 */
	clear(): void {
		this.cache.clear()
		// Reset stats on clear
		this._hits = 0
		this._misses = 0
		this._evictions = 0
	}

	/**
	 * Get all keys in the cache (in LRU order, oldest first).
	 * Does not include expired entries.
	 *
	 * @returns Iterator of cache keys
	 */
	*keys(): IterableIterator<string> {
		for (const [key, entry] of this.cache) {
			if (!this.isExpired(entry)) {
				yield key
			} else {
				// Clean up expired entry
				this.cache.delete(key)
			}
		}
	}

	/**
	 * Get all values in the cache (in LRU order, oldest first).
	 * Does not include expired entries.
	 *
	 * @returns Iterator of cache values
	 */
	*values(): IterableIterator<T> {
		for (const [key, entry] of this.cache) {
			if (!this.isExpired(entry)) {
				yield entry.value
			} else {
				// Clean up expired entry
				this.cache.delete(key)
			}
		}
	}

	/**
	 * Get all entries in the cache (in LRU order, oldest first).
	 * Does not include expired entries.
	 *
	 * @returns Iterator of [key, value] pairs
	 */
	*entries(): IterableIterator<[string, T]> {
		for (const [key, entry] of this.cache) {
			if (!this.isExpired(entry)) {
				yield [key, entry.value]
			} else {
				// Clean up expired entry
				this.cache.delete(key)
			}
		}
	}

	/**
	 * Iterate over cache entries.
	 * Enables use with for...of loops.
	 */
	[Symbol.iterator](): IterableIterator<[string, T]> {
		return this.entries()
	}

	/**
	 * Remove expired entries from the cache.
	 *
	 * @returns Number of entries removed
	 */
	prune(): number {
		let removed = 0
		const now = Date.now()

		for (const [key, entry] of this.cache) {
			if (entry.expiresAt > 0 && entry.expiresAt <= now) {
				this.cache.delete(key)
				removed++
			}
		}

		return removed
	}

	/**
	 * Reset statistics counters.
	 */
	resetStats(): void {
		this._hits = 0
		this._misses = 0
		this._evictions = 0
	}

	// =============================================================================
	// Private Methods
	// =============================================================================

	/**
	 * Check if an entry is expired.
	 */
	private isExpired(entry: CacheEntry<T>): boolean {
		return entry.expiresAt > 0 && entry.expiresAt <= Date.now()
	}

	/**
	 * Evict the least recently used entry.
	 */
	private evictLRU(): void {
		// Get the first key (oldest/least recently used)
		const firstKey = this.cache.keys().next().value

		if (firstKey !== undefined) {
			this.cache.delete(firstKey)
			this._evictions++
		}
	}
}

// =============================================================================
// Default Export & Factory
// =============================================================================

/**
 * Create a new LRU cache instance.
 *
 * @param options - Cache configuration options
 * @returns New LRU cache instance
 *
 * @example
 * ```typescript
 * const cache = createLRUCache({ maxSize: 500, defaultTtl: 60 });
 * ```
 */
export function createLRUCache<T = unknown>(
	options?: LRUCacheOptions,
): LRUCache<T> {
	return new LRUCache<T>(options)
}

/**
 * Default LRU cache instance for general use.
 * Configured with default settings (1000 items, no default TTL).
 */
export const defaultLRUCache = new LRUCache()
