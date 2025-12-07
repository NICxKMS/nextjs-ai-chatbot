import "server-only";

import { trace } from "@opentelemetry/api";
import { logError } from "@/lib/log";
import { CacheMetrics } from "./metrics";
import { getRedisClient, isRedisAvailable } from "./redis";

/**
 * ==============================================================================
 * QUERY RESULT CACHING
 * ==============================================================================
 *
 * Provides caching layer for database query results to reduce DB load.
 * Complements the existing chat/message cache with flexible query-level caching.
 *
 * Features:
 * - Automatic cache key generation
 * - Configurable TTL per query type
 * - Metrics integration
 * - Stale-while-revalidate pattern support
 * - Batch invalidation
 *
 * Use cases:
 * - User profile data (TTL: 5 minutes)
 * - Chat lists (TTL: 1 minute)
 * - Vote counts (TTL: 30 seconds)
 * - Analytics queries (TTL: 15 minutes)
 */

/**
 * Cache TTL presets for different query types
 */
export const CacheTTL = {
    SHORT: 30, // 30 seconds - frequently changing data
    MEDIUM: 300, // 5 minutes - moderate change rate
    LONG: 900, // 15 minutes - infrequent changes
    EXTENDED: 3600, // 1 hour - rarely changing data
} as const;

/**
 * Query cache options
 */
type QueryCacheOptions = {
    /** Time-to-live in seconds */
    ttl?: number;
    /** Namespace for cache key (e.g., "user", "chat", "analytics") */
    namespace?: string;
    /** Additional tags for batch invalidation */
    tags?: string[];
    /** Enable stale-while-revalidate pattern */
    staleWhileRevalidate?: boolean;
};

/**
 * Generate cache key from namespace and parameters
 */
function generateCacheKey(
    namespace: string,
    params: Record<string, unknown>
): string {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}:${JSON.stringify(params[key])}`)
        .join("|");

    return `query:${namespace}:${sortedParams}`;
}

/**
 * Cache a query result with automatic metrics tracking
 */
export async function getCachedQueryResult<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {}
): Promise<T> {
    const {
        ttl = CacheTTL.MEDIUM,
        namespace = "default",
        staleWhileRevalidate = false,
    } = options;

    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) {
        return queryFn();
    }

    const cacheKey =
        namespace === "default"
            ? `query:${key}`
            : generateCacheKey(namespace, { key });
    const span = trace.getActiveSpan();

    if (span) {
        span.setAttribute("cache.query.key", cacheKey);
        span.setAttribute("cache.query.ttl", ttl);
    }

    try {
        const start = performance.now();
        const cached = await redis.get<T>(cacheKey);
        const latency = performance.now() - start;

        if (cached !== null) {
            CacheMetrics.recordHit(`query:${namespace}`, latency);

            if (span) {
                span.setAttribute("cache.query.hit", true);
            }

            if (staleWhileRevalidate) {
                queryFn()
                    .then((freshResult) => {
                        redis
                            .set(cacheKey, freshResult, { ex: ttl })
                            .catch((err) =>
                                logError("Background cache refresh failed", err)
                            );
                    })
                    .catch(() => {
                        // Silently fail
                    });
            }

            return cached;
        }

        CacheMetrics.recordMiss(`query:${namespace}`, latency);

        if (span) {
            span.setAttribute("cache.query.hit", false);
        }

        const queryStart = performance.now();
        const result = await queryFn();
        const queryDuration = performance.now() - queryStart;

        if (span) {
            span.setAttribute("cache.query.db_duration_ms", queryDuration);
        }

        redis
            .set(cacheKey, result, { ex: ttl })
            .catch((err) => logError("Query cache set failed", err));

        return result;
    } catch (error) {
        CacheMetrics.recordError(`query:${namespace}`, error);

        if (span) {
            span.recordException(error as Error);
        }

        logError("Query cache error, falling back to direct query", error);
        return queryFn();
    }
}

/**
 * Cache multiple query results in parallel
 */
export function getCachedQueryResults<T>(
    queries: Array<{
        key: string;
        fn: () => Promise<T>;
        options?: QueryCacheOptions;
    }>
): Promise<T[]> {
    return Promise.all(
        queries.map(({ key, fn, options }) =>
            getCachedQueryResult(key, fn, options)
        )
    );
}

/**
 * Invalidate cached query results by pattern
 */
export async function invalidateQueryCache(pattern: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    try {
        const keys = await redis.keys(pattern);

        if (keys.length === 0) {
            return 0;
        }

        await redis.del(...keys);
        return keys.length;
    } catch (error) {
        logError("Query cache invalidation failed", error);
        return 0;
    }
}

/**
 * Invalidate multiple cache patterns in batch
 */
export async function invalidateQueryCacheBatch(
    patterns: string[]
): Promise<number> {
    const results = await Promise.all(
        patterns.map((pattern) => invalidateQueryCache(pattern))
    );
    return results.reduce((sum, count) => sum + count, 0);
}

/**
 * Helper to invalidate user-specific caches
 */
export function invalidateUserQueryCache(userId: string): Promise<number> {
    return invalidateQueryCacheBatch([
        `query:user:*userId:"${userId}"*`,
        `query:chat:*userId:"${userId}"*`,
        `query:document:*userId:"${userId}"*`,
    ]);
}

/**
 * Pre-warm cache with fresh data
 */
export async function warmQueryCache<T>(
    key: string,
    data: T,
    options: QueryCacheOptions = {}
): Promise<void> {
    const { ttl = CacheTTL.MEDIUM, namespace = "default" } = options;

    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    const cacheKey =
        namespace === "default"
            ? `query:${key}`
            : generateCacheKey(namespace, { key });

    try {
        await redis.set(cacheKey, data, { ex: ttl });
    } catch (error) {
        logError("Query cache warming failed", error);
    }
}
