/**
 * Cache Metrics
 * Ref: P2-014 - Cache hit/miss metrics for observability
 *
 * Provides metrics tracking for cache operations:
 * - Hit count
 * - Miss count
 * - Hit rate percentage
 * - Per-operation breakdown
 *
 * Thread-safe for concurrent requests (atomic operations on primitives).
 * Metrics are stored in-memory per instance.
 *
 * @warning SERVERLESS LIMITATION
 * In serverless environments, metrics are per-instance and not aggregated.
 * For production monitoring, consider exporting to external metrics service.
 *
 * @module lib/cache/metrics
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Metrics for a specific operation type
 */
export interface OperationMetrics {
    hits: number;
    misses: number;
}

/**
 * Aggregated cache metrics snapshot
 */
export interface CacheMetricsSnapshot {
    /** Total cache hits across all operations */
    hits: number;
    /** Total cache misses across all operations */
    misses: number;
    /** Hit rate as percentage (0-100) */
    hitRate: number;
    /** Timestamp when snapshot was taken */
    timestamp: number;
    /** Per-operation breakdown */
    operations: Record<string, OperationMetrics>;
}

/**
 * Cache metrics interface for observability
 */
export interface CacheMetrics {
    /** Total hits */
    hits: number;
    /** Total misses */
    misses: number;
    /** Calculate hit rate percentage */
    hitRate: () => number;
    /** Reset all metrics */
    reset: () => void;
    /** Per-operation metrics */
    operations: Record<string, OperationMetrics>;
}

// =============================================================================
// GLOBAL STATE (HMR-safe)
// =============================================================================

const globalForMetrics = globalThis as unknown as {
    cacheMetrics: CacheMetrics;
    cacheMetricsInitialized: boolean;
};

/**
 * Initialize or get metrics singleton
 */
function getMetricsState(): CacheMetrics {
    if (!globalForMetrics.cacheMetricsInitialized) {
        globalForMetrics.cacheMetrics = {
            hits: 0,
            misses: 0,
            hitRate: () => {
                const total =
                    globalForMetrics.cacheMetrics.hits +
                    globalForMetrics.cacheMetrics.misses;
                return total > 0
                    ? (globalForMetrics.cacheMetrics.hits / total) * 100
                    : 0;
            },
            reset: () => {
                globalForMetrics.cacheMetrics.hits = 0;
                globalForMetrics.cacheMetrics.misses = 0;
                globalForMetrics.cacheMetrics.operations = {};
            },
            operations: {},
        };
        globalForMetrics.cacheMetricsInitialized = true;
    }
    return globalForMetrics.cacheMetrics;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Record a cache hit
 *
 * @param operation - Optional operation name for per-operation tracking
 */
export function recordCacheHit(operation?: string): void {
    const metrics = getMetricsState();
    metrics.hits++;

    if (operation) {
        if (!metrics.operations[operation]) {
            metrics.operations[operation] = { hits: 0, misses: 0 };
        }
        metrics.operations[operation].hits++;
    }
}

/**
 * Record a cache miss
 *
 * @param operation - Optional operation name for per-operation tracking
 */
export function recordCacheMiss(operation?: string): void {
    const metrics = getMetricsState();
    metrics.misses++;

    if (operation) {
        if (!metrics.operations[operation]) {
            metrics.operations[operation] = { hits: 0, misses: 0 };
        }
        metrics.operations[operation].misses++;
    }
}

/**
 * Get current cache metrics snapshot
 *
 * Returns a copy of current metrics with calculated hit rate.
 *
 * @returns Snapshot of current metrics
 */
export function getCacheMetrics(): CacheMetricsSnapshot {
    const metrics = getMetricsState();
    return {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hitRate(),
        timestamp: Date.now(),
        operations: { ...metrics.operations },
    };
}

/**
 * Reset all cache metrics
 *
 * Useful for testing or periodic resets.
 */
export function resetCacheMetrics(): void {
    const metrics = getMetricsState();
    metrics.reset();
}

/**
 * Get hit rate for a specific operation
 *
 * @param operation - Operation name
 * @returns Hit rate percentage (0-100) or 0 if no data
 */
export function getOperationHitRate(operation: string): number {
    const metrics = getMetricsState();
    const op = metrics.operations[operation];

    if (!op) {
        return 0;
    }

    const total = op.hits + op.misses;
    return total > 0 ? (op.hits / total) * 100 : 0;
}
