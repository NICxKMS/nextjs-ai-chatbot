/**
 * Request Deduplication
 *
 * Prevents duplicate concurrent requests to the same endpoint.
 * Useful for avoiding redundant API calls from multiple components.
 *
 * @module lib/api/request-dedup
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DedupConfig {
    /** Time-to-live for cached responses in milliseconds (default: 0 - no caching) */
    cacheTtl?: number;
    /** Custom key generator function */
    keyGenerator?: (url: string, options?: RequestInit) => string;
    /** Maximum number of cached responses (default: 100) */
    maxCacheSize?: number;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface PendingRequest<T> {
    promise: Promise<T>;
    controller: AbortController;
}

// =============================================================================
// REQUEST DEDUPLICATOR CLASS
// =============================================================================

/**
 * Request deduplicator with optional response caching.
 *
 * Features:
 * - Deduplicates concurrent identical requests
 * - Optional response caching with TTL
 * - LRU cache eviction
 * - Request cancellation support
 *
 * @example
 * ```ts
 * const dedup = new RequestDeduplicator({ cacheTtl: 5000 });
 *
 * // These will share a single request
 * const [data1, data2] = await Promise.all([
 *   dedup.dedupe('user-1', () => fetchUser(1)),
 *   dedup.dedupe('user-1', () => fetchUser(1)),
 * ]);
 * ```
 */
export class RequestDeduplicator<T = unknown> {
    private readonly pending = new Map<string, PendingRequest<T>>();
    private readonly cache = new Map<string, CacheEntry<T>>();
    private cacheOrder: string[] = [];
    private readonly config: Required<DedupConfig>;

    constructor(config: DedupConfig = {}) {
        this.config = {
            cacheTtl: config.cacheTtl ?? 0,
            keyGenerator:
                config.keyGenerator ?? this.defaultKeyGenerator.bind(this),
            maxCacheSize: config.maxCacheSize ?? 100,
        };
    }

    /**
     * Default key generator for HTTP requests.
     */
    private defaultKeyGenerator(url: string, options?: RequestInit): string {
        const method = options?.method?.toUpperCase() ?? "GET";
        const body = options?.body ? String(options.body) : "";
        return `${method}:${url}:${body}`;
    }

    /**
     * Generate a cache key.
     */
    generateKey(url: string, options?: RequestInit): string {
        return this.config.keyGenerator(url, options);
    }

    /**
     * Check if a cached response exists and is valid.
     */
    private getCached(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
            return null;
        }

        // Move to end of LRU order
        this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
        this.cacheOrder.push(key);

        return entry.data;
    }

    /**
     * Store a response in cache.
     */
    private setCache(key: string, data: T): void {
        if (this.config.cacheTtl <= 0) {
            return;
        }

        // Evict oldest entries if at capacity
        while (this.cache.size >= this.config.maxCacheSize) {
            const oldest = this.cacheOrder.shift();
            if (oldest) {
                this.cache.delete(oldest);
            }
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.config.cacheTtl,
        });
        this.cacheOrder.push(key);
    }

    /**
     * Execute a request with deduplication.
     *
     * @param key - Unique key for this request
     * @param requestFn - Function that performs the actual request
     * @returns Promise resolving to the response data
     */
    async dedupe(key: string, requestFn: () => Promise<T>): Promise<T> {
        // Check cache first
        const cached = this.getCached(key);
        if (cached !== null) {
            return cached;
        }

        // Check for pending request
        const pending = this.pending.get(key);
        if (pending) {
            return pending.promise;
        }

        // Create new request
        const controller = new AbortController();
        const promise = requestFn()
            .then((data) => {
                this.setCache(key, data);
                return data;
            })
            .finally(() => {
                this.pending.delete(key);
            });

        this.pending.set(key, { promise, controller });
        return promise;
    }

    /**
     * Execute a fetch request with deduplication.
     *
     * @param url - Request URL
     * @param options - Fetch options
     * @param transformer - Optional response transformer
     * @returns Promise resolving to the transformed response
     */
    async fetch(
        url: string,
        options?: RequestInit,
        transformer?: (response: Response) => Promise<T>
    ): Promise<T> {
        const key = this.generateKey(url, options);

        return this.dedupe(key, async () => {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }
            if (transformer) {
                return transformer(response);
            }
            return response.json() as Promise<T>;
        });
    }

    /**
     * Cancel a pending request.
     */
    cancel(key: string): boolean {
        const pending = this.pending.get(key);
        if (pending) {
            pending.controller.abort();
            this.pending.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Cancel all pending requests.
     */
    cancelAll(): void {
        for (const { controller } of this.pending.values()) {
            controller.abort();
        }
        this.pending.clear();
    }

    /**
     * Clear the response cache.
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheOrder = [];
    }

    /**
     * Invalidate a specific cache entry.
     */
    invalidate(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
        }
        return deleted;
    }

    /**
     * Invalidate cache entries matching a pattern.
     */
    invalidatePattern(pattern: RegExp): number {
        let count = 0;
        for (const key of Array.from(this.cache.keys())) {
            if (pattern.test(key)) {
                this.cache.delete(key);
                this.cacheOrder = this.cacheOrder.filter((k) => k !== key);
                count++;
            }
        }
        return count;
    }

    /**
     * Get cache statistics.
     */
    getStats(): {
        pendingCount: number;
        cacheSize: number;
        cacheHits: number;
    } {
        return {
            pendingCount: this.pending.size,
            cacheSize: this.cache.size,
            cacheHits: 0, // Would need to track this separately
        };
    }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/**
 * Default request deduplicator for general API requests.
 * No caching - only deduplication of concurrent requests.
 */
export const requestDedup = new RequestDeduplicator();

/**
 * Request deduplicator with short-lived cache for read operations.
 * 5 second TTL for commonly fetched data.
 */
export const cachedRequestDedup = new RequestDeduplicator({
    cacheTtl: 5000,
    maxCacheSize: 50,
});

// =============================================================================
// HOOK UTILITIES
// =============================================================================

/**
 * Create a deduplicated fetcher for use with SWR or similar libraries.
 *
 * @example
 * ```ts
 * const fetcher = createDedupFetcher();
 *
 * // Use with SWR
 * const { data } = useSWR('/api/user', fetcher);
 * ```
 */
export function createDedupFetcher<T = unknown>(
    dedup: RequestDeduplicator<T> = requestDedup as RequestDeduplicator<T>
): (url: string) => Promise<T> {
    return (url: string) => dedup.fetch(url);
}

/**
 * Create a deduplicated fetch function that works with SWR's fetcher interface.
 */
export function createSwrFetcher<T>(options?: {
    dedup?: RequestDeduplicator<T>;
    headers?: Record<string, string>;
}): (url: string) => Promise<T> {
    const dedup = options?.dedup ?? (requestDedup as RequestDeduplicator<T>);
    const headers = options?.headers ?? {};

    return (url: string) =>
        dedup.fetch(url, {
            headers: {
                Accept: "application/json",
                ...headers,
            },
        });
}

// =============================================================================
// REQUEST COALESCING
// =============================================================================

/**
 * Coalesce multiple requests into batched calls.
 * Useful for batching individual item fetches into bulk operations.
 *
 * @example
 * ```ts
 * const userLoader = createBatchLoader<string, User>(
 *   async (ids) => {
 *     const users = await fetchUsers(ids);
 *     return new Map(users.map(u => [u.id, u]));
 *   },
 *   { maxBatchSize: 100, delayMs: 10 }
 * );
 *
 * // These will be batched into a single request
 * const [user1, user2] = await Promise.all([
 *   userLoader.load('1'),
 *   userLoader.load('2'),
 * ]);
 * ```
 */
export function createBatchLoader<K, V>(
    batchFn: (keys: K[]) => Promise<Map<K, V>>,
    options: {
        maxBatchSize?: number;
        delayMs?: number;
    } = {}
): {
    load: (key: K) => Promise<V>;
    loadMany: (keys: K[]) => Promise<Map<K, V>>;
    clear: () => void;
} {
    const { maxBatchSize = 100, delayMs = 10 } = options;

    let batch: K[] = [];
    let batchPromise: Promise<void> | null = null;
    let resolvers = new Map<
        K,
        { resolve: (value: V) => void; reject: (error: Error) => void }
    >();

    const executeBatch = async (): Promise<void> => {
        const currentBatch = batch;
        const currentResolvers = resolvers;
        batch = [];
        resolvers = new Map();
        batchPromise = null;

        try {
            const results = await batchFn(currentBatch);
            for (const key of currentBatch) {
                const resolver = currentResolvers.get(key);
                if (resolver) {
                    const value = results.get(key);
                    if (value !== undefined) {
                        resolver.resolve(value);
                    } else {
                        resolver.reject(
                            new Error(`Key not found: ${String(key)}`)
                        );
                    }
                }
            }
        } catch (error) {
            for (const resolver of currentResolvers.values()) {
                resolver.reject(
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        }
    };

    const load = (key: K): Promise<V> => {
        return new Promise((resolve, reject) => {
            resolvers.set(key, { resolve, reject });
            batch.push(key);

            if (batch.length >= maxBatchSize) {
                executeBatch().catch(() => {});
            } else if (!batchPromise) {
                batchPromise = new Promise<void>((r) =>
                    setTimeout(r, delayMs)
                ).then(() => executeBatch());
            }
        });
    };

    const loadMany = async (keys: K[]): Promise<Map<K, V>> => {
        const results = await Promise.allSettled(keys.map(load));
        const map = new Map<K, V>();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const result = results[i];
            if (
                key !== undefined &&
                result !== undefined &&
                result.status === "fulfilled"
            ) {
                map.set(key, result.value);
            }
        }
        return map;
    };

    const clear = (): void => {
        batch = [];
        resolvers.clear();
        batchPromise = null;
    };

    return { load, loadMany, clear };
}
