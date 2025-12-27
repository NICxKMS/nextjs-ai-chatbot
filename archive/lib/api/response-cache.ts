/**
 * Response Caching Layer
 *
 * Client-side response cache for GET requests with TTL and pattern invalidation.
 * Separate from request deduplication - this is for caching completed responses.
 *
 * @module lib/api/response-cache
 * @see OPT-026
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CacheEntry<T = unknown> {
    /** Cached data */
    data: T;
    /** Timestamp when entry was created */
    timestamp: number;
    /** Time-to-live in milliseconds */
    ttl: number;
    /** Optional ETag for revalidation */
    etag?: string;
    /** Optional tags for group invalidation */
    tags?: string[];
}

export interface CacheOptions {
    /** Time-to-live in milliseconds (default: 60000 = 1 minute) */
    ttl?: number;
    /** ETag for cache revalidation */
    etag?: string;
    /** Tags for group invalidation */
    tags?: string[];
}

export interface CacheStats {
    /** Number of entries in cache */
    size: number;
    /** Number of cache hits */
    hits: number;
    /** Number of cache misses */
    misses: number;
    /** Hit rate percentage */
    hitRate: number;
    /** Total memory estimate (bytes) */
    memoryEstimate: number;
}

export interface ResponseCacheConfig {
    /** Maximum number of entries (default: 100) */
    maxSize?: number;
    /** Default TTL in milliseconds (default: 60000) */
    defaultTtl?: number;
    /** Whether to enable LRU eviction (default: true) */
    enableLru?: boolean;
    /** Callback when entry is evicted */
    onEvict?: (key: string, entry: CacheEntry) => void;
}

// =============================================================================
// RESPONSE CACHE CLASS
// =============================================================================

/**
 * Client-side response cache with TTL, LRU eviction, and pattern invalidation.
 *
 * @example
 * ```ts
 * const cache = new ResponseCache({ maxSize: 50, defaultTtl: 30000 });
 *
 * // Cache a response
 * cache.set('/api/users', users, { ttl: 60000, tags: ['users'] });
 *
 * // Get cached response
 * const cached = cache.get<User[]>('/api/users');
 * if (cached) {
 *   // Use cached data
 * }
 *
 * // Invalidate by pattern
 * cache.invalidate(/^\/api\/users/);
 *
 * // Invalidate by tag
 * cache.invalidateByTag('users');
 * ```
 */
export class ResponseCache {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly accessOrder: string[] = [];
    private readonly config: Required<ResponseCacheConfig>;
    private stats = { hits: 0, misses: 0 };

    constructor(config: ResponseCacheConfig = {}) {
        this.config = {
            maxSize: config.maxSize ?? 100,
            defaultTtl: config.defaultTtl ?? 60_000,
            enableLru: config.enableLru ?? true,
            onEvict: config.onEvict ?? (() => {}),
        };
    }

    /**
     * Get a cached entry if valid.
     */
    get<T = unknown>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }

        // Update LRU order
        if (this.config.enableLru) {
            this.updateAccessOrder(key);
        }

        this.stats.hits++;
        return entry.data as T;
    }

    /**
     * Get entry with metadata (for revalidation scenarios).
     */
    getEntry<T = unknown>(key: string): CacheEntry<T> | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key);
            return null;
        }

        return entry as CacheEntry<T>;
    }

    /**
     * Store data in cache.
     */
    set<T = unknown>(key: string, data: T, options: CacheOptions = {}): void {
        // Evict oldest if at capacity
        while (this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: options.ttl ?? this.config.defaultTtl,
            etag: options.etag,
            tags: options.tags,
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);
    }

    /**
     * Delete a specific cache entry.
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.config.onEvict(key, entry);
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            return true;
        }
        return false;
    }

    /**
     * Check if a key exists and is valid.
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }

        // Check if expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Invalidate entries matching a pattern.
     */
    invalidate(pattern: string | RegExp): number {
        const regex =
            typeof pattern === "string" ? new RegExp(pattern) : pattern;
        let count = 0;

        for (const key of Array.from(this.cache.keys())) {
            if (regex.test(key)) {
                this.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Invalidate entries by tag.
     */
    invalidateByTag(tag: string): number {
        let count = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags?.includes(tag)) {
                this.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Invalidate entries by multiple tags (entries with ANY matching tag).
     */
    invalidateByTags(tags: string[]): number {
        let count = 0;
        const tagSet = new Set(tags);

        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags?.some((t) => tagSet.has(t))) {
                this.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Clear all cached entries.
     */
    clear(): void {
        for (const [key, entry] of this.cache.entries()) {
            this.config.onEvict(key, entry);
        }
        this.cache.clear();
        this.accessOrder.length = 0;
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * Get cache statistics.
     */
    getStats(): CacheStats {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            size: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
            memoryEstimate: this.estimateMemory(),
        };
    }

    /**
     * Get all keys in cache.
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Prune expired entries.
     */
    prune(): number {
        const now = Date.now();
        let count = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp + entry.ttl) {
                this.delete(key);
                count++;
            }
        }

        return count;
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    private evictOldest(): void {
        const oldest = this.accessOrder.shift();
        if (oldest) {
            const entry = this.cache.get(oldest);
            if (entry) {
                this.config.onEvict(oldest, entry);
            }
            this.cache.delete(oldest);
        }
    }

    private estimateMemory(): number {
        let estimate = 0;
        for (const [key, entry] of this.cache.entries()) {
            // Rough estimate: key length + JSON stringified data length
            estimate += key.length * 2; // UTF-16
            estimate += JSON.stringify(entry.data).length * 2;
            estimate += 100; // Overhead for entry metadata
        }
        return estimate;
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default response cache instance.
 * Configured for typical API response caching.
 */
export const responseCache = new ResponseCache({
    maxSize: 100,
    defaultTtl: 60_000, // 1 minute default
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a cached fetch wrapper.
 *
 * @example
 * ```ts
 * const cachedFetch = createCachedFetch(responseCache);
 *
 * // First call fetches from network
 * const data1 = await cachedFetch('/api/users');
 *
 * // Second call returns cached data
 * const data2 = await cachedFetch('/api/users');
 * ```
 */
export function createCachedFetch<T = unknown>(
    cache: ResponseCache,
    options: CacheOptions = {}
): (url: string, fetchOptions?: RequestInit) => Promise<T> {
    return async (url: string, fetchOptions?: RequestInit): Promise<T> => {
        // Only cache GET requests
        const method = fetchOptions?.method?.toUpperCase() ?? "GET";
        if (method !== "GET") {
            const response = await fetch(url, fetchOptions);
            return response.json() as Promise<T>;
        }

        // Check cache first
        const cached = cache.get<T>(url);
        if (cached !== null) {
            return cached;
        }

        // Fetch and cache
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as T;
        cache.set(url, data, options);

        return data;
    };
}

/**
 * Cache decorator for async functions.
 *
 * @example
 * ```ts
 * const getUser = withCache(
 *   async (id: string) => fetchUser(id),
 *   (id) => `user:${id}`,
 *   { ttl: 30000 }
 * );
 *
 * const user = await getUser('123'); // Fetches
 * const user2 = await getUser('123'); // Returns cached
 * ```
 */
export function withCache<Args extends unknown[], Result>(
    fn: (...args: Args) => Promise<Result>,
    keyFn: (...args: Args) => string,
    options: CacheOptions & { cache?: ResponseCache } = {}
): (...args: Args) => Promise<Result> {
    const cache = options.cache ?? responseCache;

    return async (...args: Args): Promise<Result> => {
        const key = keyFn(...args);

        const cached = cache.get<Result>(key);
        if (cached !== null) {
            return cached;
        }

        const result = await fn(...args);
        cache.set(key, result, options);

        return result;
    };
}
