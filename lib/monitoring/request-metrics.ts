import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * ==============================================================================
 * PER-REQUEST METRICS TRACKING
 * ==============================================================================
 *
 * Tracks database and cache operation statistics for each request.
 * Uses AsyncLocalStorage for request-scoped metrics that propagate
 * across async calls.
 *
 * Features:
 * - DB call count and total duration
 * - Cache call count with hit/miss breakdown
 * - Automatic aggregation at request end
 *
 * Usage:
 * ```typescript
 * // Wrap API handler
 * return runWithRequestMetrics(async () => {
 *   // ... handler code ...
 *   const metrics = getRequestMetrics();
 *   logger.perf("operation", duration, { ...metrics });
 * });
 * ```
 */

export type RequestMetrics = {
    dbCalls: number;
    dbTotalDurationMs: number;
    cacheCalls: number;
    cacheHits: number;
    cacheMisses: number;
    cacheTotalDurationMs: number;
};

const metricsStorage = new AsyncLocalStorage<RequestMetrics>();

/**
 * Create a fresh metrics object
 */
export function initRequestMetrics(): RequestMetrics {
    return {
        dbCalls: 0,
        dbTotalDurationMs: 0,
        cacheCalls: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheTotalDurationMs: 0,
    };
}

/**
 * Get current request metrics
 * Returns undefined if called outside of a request context
 */
export function getRequestMetrics(): RequestMetrics | undefined {
    return metricsStorage.getStore();
}

/**
 * Run a synchronous function within a metrics context
 */
export function runWithRequestMetrics<T>(fn: () => T): T {
    return metricsStorage.run(initRequestMetrics(), fn);
}

/**
 * Run an async function within a metrics context
 */
export function runWithRequestMetricsAsync<T>(
    fn: () => Promise<T>
): Promise<T> {
    return metricsStorage.run(initRequestMetrics(), fn);
}

/**
 * Record a database call
 * @param durationMs Duration of the DB call in milliseconds
 */
export function recordDbCall(durationMs: number): void {
    const metrics = metricsStorage.getStore();
    if (metrics) {
        metrics.dbCalls++;
        metrics.dbTotalDurationMs += durationMs;
    }
}

/**
 * Record a cache hit
 * @param durationMs Duration of the cache operation in milliseconds
 */
export function recordCacheHit(durationMs: number): void {
    const metrics = metricsStorage.getStore();
    if (metrics) {
        metrics.cacheCalls++;
        metrics.cacheHits++;
        metrics.cacheTotalDurationMs += durationMs;
    }
}

/**
 * Record a cache miss
 * @param durationMs Duration of the cache operation in milliseconds
 */
export function recordCacheMiss(durationMs: number): void {
    const metrics = metricsStorage.getStore();
    if (metrics) {
        metrics.cacheCalls++;
        metrics.cacheMisses++;
        metrics.cacheTotalDurationMs += durationMs;
    }
}

/**
 * Record a cache operation (generic, for write operations)
 * @param durationMs Duration of the cache operation in milliseconds
 */
export function recordCacheOperation(durationMs: number): void {
    const metrics = metricsStorage.getStore();
    if (metrics) {
        metrics.cacheCalls++;
        metrics.cacheTotalDurationMs += durationMs;
    }
}

/**
 * Get metrics summary for logging
 * Returns empty object if no metrics context
 */
export function getMetricsSummary(): Partial<RequestMetrics> {
    const metrics = metricsStorage.getStore();
    if (!metrics) {
        return {};
    }
    return {
        dbCalls: metrics.dbCalls,
        dbTotalDurationMs: Math.round(metrics.dbTotalDurationMs),
        cacheCalls: metrics.cacheCalls,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        cacheTotalDurationMs: Math.round(metrics.cacheTotalDurationMs),
    };
}
