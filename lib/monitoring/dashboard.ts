import "server-only";

import { getRedisClient } from "@/lib/cache/redis";
import { type PoolStats, poolMonitor } from "@/lib/db/pool-monitor";
import {
    addAttributes,
    getNewRelicAgent,
    noticeError as noticeNewRelicErrorInternal,
    recordEvent,
    recordMetric,
} from "./newrelic-agent";

/**
 * ==============================================================================
 * PERFORMANCE MONITORING DASHBOARD - NEW RELIC INTEGRATION
 * ==============================================================================
 *
 * Aggregates metrics from all observability modules and sends to New Relic.
 * Provides health checks, diagnostics, and real-time APM integration.
 *
 * Features:
 * - Real-time system health status
 * - New Relic custom events and metrics
 * - Database and cache metrics aggregation
 * - Connection pool statistics
 * - Rate limiting and deduplication insights
 * - Automatic error tracking
 * - Custom dashboards support
 *
 * Modules monitored:
 * - Database: Queries, transactions, batches
 * - Cache: Hit/miss rates, warming, invalidation
 * - Connections: Pool health, leaks
 * - Middleware: Rate limits, deduplication
 *
 * Setup:
 * 1. Install New Relic: npm install newrelic
 * 2. Set env var: NEW_RELIC_LICENSE_KEY=your_key
 * 3. Set env var: NEW_RELIC_APP_NAME=ai-assistant
 * 4. Import newrelic at app entry: import 'newrelic' (optional, auto-detects)
 */

export type HealthStatus = "healthy" | "degraded" | "critical";

export type SystemHealth = {
    status: HealthStatus;
    timestamp: string;
    uptime: number;
    components: {
        cache: ComponentHealth;
        connectionPool: ComponentHealth;
    };
    metrics: AggregatedMetrics;
};

export type ComponentHealth = {
    status: HealthStatus;
    message: string;
    details: Record<string, unknown>;
};

export type AggregatedMetrics = {
    database: {
        totalQueries: number;
        totalTransactions: number;
        averageQueryDuration: number;
        slowQueries: number;
        errorRate: number;
    };
    cache: {
        hitRate: number;
        missRate: number;
        totalRequests: number;
        averageLatency: number;
        memoryUsage?: number;
        evictions?: number;
    };
    connectionPool: PoolStats;
    rateLimit?: {
        totalRequests: number;
        blockedRequests: number;
        blockRate: number;
    };
    deduplication?: {
        duplicatesDetected: number;
        cacheHits: number;
        savingsPercent: number;
    };
};

const startTime = Date.now();

/**
 * Notice error in New Relic (exported wrapper for backward compatibility)
 */
export function noticeNewRelicError(
    error: Error,
    customAttributes?: Record<string, unknown>
) {
    noticeNewRelicErrorInternal(error, customAttributes);
}

/**
 * Check cache (Redis) health
 */
async function checkCacheHealth(): Promise<ComponentHealth> {
    const redis = getRedisClient();

    if (!redis) {
        // In development or when Redis is intentionally disabled,
        // treat "not configured" as healthy rather than degraded
        const isDev = process.env.NODE_ENV === "development";

        recordEvent("CacheHealthCheck", {
            status: isDev ? "healthy" : "degraded",
            reason: "not_configured",
        });

        return {
            status: isDev ? "healthy" : "degraded",
            message: isDev
                ? "Redis not configured (optional in development)"
                : "Redis not configured",
            details: { configured: false },
        };
    }

    try {
        const start = Date.now();
        await redis.ping();
        const duration = Date.now() - start;

        recordMetric("Custom/Cache/ResponseTime", duration);

        // Upstash Redis over HTTP can have higher latency on cold starts
        // Use 2000ms threshold for "degraded" (allows for cold start + network latency)
        // Only mark as degraded if consistently slow (not just initial connection)
        const slowThresholdMs = 2000;

        if (duration > slowThresholdMs) {
            recordEvent("CacheHealthCheck", {
                status: "degraded",
                reason: "slow_response",
                responseTime: duration,
            });

            return {
                status: "degraded",
                message: "Cache responding slowly",
                details: { responseTime: duration, threshold: slowThresholdMs },
            };
        }

        recordEvent("CacheHealthCheck", {
            status: "healthy",
            responseTime: duration,
        });

        return {
            status: "healthy",
            message: "Cache operational",
            details: { responseTime: duration },
        };
    } catch (error) {
        noticeNewRelicError(
            error instanceof Error ? error : new Error(String(error)),
            {
                component: "cache",
                operation: "health_check",
            }
        );

        recordEvent("CacheHealthCheck", {
            status: "critical",
            reason: "unavailable",
        });

        return {
            status: "critical",
            message: "Cache unavailable",
            details: { error: String(error) },
        };
    }
}

/**
 * Check connection pool health
 */
function checkConnectionPoolHealth(): ComponentHealth {
    const stats = poolMonitor.getPoolStats();

    // Record pool metrics to New Relic
    recordMetric("Custom/ConnectionPool/Active", stats.active);
    recordMetric("Custom/ConnectionPool/Idle", stats.idle);
    recordMetric("Custom/ConnectionPool/Waiting", stats.waiting);
    recordMetric("Custom/ConnectionPool/Total", stats.total);

    const usageRate = stats.max > 0 ? stats.active / stats.max : 0;
    recordMetric("Custom/ConnectionPool/UsageRate", usageRate);

    // Check for high wait times
    if (stats.waiting > 10) {
        recordEvent("ConnectionPoolHealthCheck", {
            status: "degraded",
            reason: "high_wait_queue",
            waiting: stats.waiting,
        });

        return {
            status: "degraded",
            message: "High connection wait queue",
            details: stats,
        };
    }

    // Check pool exhaustion
    if (usageRate > 0.9) {
        recordEvent("ConnectionPoolHealthCheck", {
            status: "degraded",
            reason: "near_capacity",
            usageRate,
            active: stats.active,
            max: stats.max,
        });

        return {
            status: "degraded",
            message: "Connection pool near capacity",
            details: { ...stats, usageRate },
        };
    }

    recordEvent("ConnectionPoolHealthCheck", {
        status: "healthy",
        active: stats.active,
        idle: stats.idle,
    });

    return {
        status: "healthy",
        message: "Connection pool optimal",
        details: stats,
    };
}

/**
 * Get database metrics from pool monitor
 */
function getDatabaseMetrics(): AggregatedMetrics["database"] {
    const connectionMetrics = poolMonitor.getConnectionMetrics();

    // Estimate queries based on connections created/acquired
    const totalQueries = connectionMetrics.acquired;
    const totalTransactions = Math.floor(totalQueries * 0.1); // Estimate
    const errorRate = connectionMetrics.errors / Math.max(totalQueries, 1);

    // Record to New Relic
    recordMetric("Custom/Database/QueriesTotal", totalQueries);
    recordMetric("Custom/Database/TransactionsTotal", totalTransactions);
    recordMetric("Custom/Database/ErrorRate", errorRate);
    recordMetric("Custom/Database/Timeouts", connectionMetrics.timeouts);

    return {
        totalQueries,
        totalTransactions,
        averageQueryDuration: 50, // Placeholder - would come from query tracking
        slowQueries: 0,
        errorRate,
    };
}

/**
 * Get cache metrics from CacheMetrics collector
 * Uses real in-memory metrics instead of Redis stored values
 */
async function getCacheMetrics(): Promise<AggregatedMetrics["cache"]> {
    // Import CacheMetrics dynamically to avoid circular dependency
    const { CacheMetrics } = await import("@/lib/cache/metrics");

    const summary = CacheMetrics.getSummary();

    // Aggregate across all operations
    let totalHits = 0;
    let totalMisses = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let operationCount = 0;

    for (const opMetrics of Object.values(summary)) {
        totalHits += opMetrics.hits;
        totalMisses += opMetrics.misses;
        totalErrors += opMetrics.errors;
        totalLatency +=
            opMetrics.avgLatencyMs * (opMetrics.hits + opMetrics.misses);
        operationCount += opMetrics.hits + opMetrics.misses;
    }

    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? totalHits / total : 0;
    const missRate = total > 0 ? totalMisses / total : 0;
    const avgLatency = operationCount > 0 ? totalLatency / operationCount : 0;

    // Record to New Relic
    recordMetric("Custom/Cache/HitRate", hitRate);
    recordMetric("Custom/Cache/MissRate", missRate);
    recordMetric("Custom/Cache/Hits", totalHits);
    recordMetric("Custom/Cache/Misses", totalMisses);
    recordMetric("Custom/Cache/Errors", totalErrors);
    recordMetric("Custom/Cache/TotalRequests", total);
    recordMetric("Custom/Cache/AvgLatencyMs", avgLatency);

    // Record per-operation metrics
    for (const [operation, opMetrics] of Object.entries(summary)) {
        recordEvent("CacheOperationMetrics", {
            operation,
            hits: opMetrics.hits,
            misses: opMetrics.misses,
            errors: opMetrics.errors,
            hitRate: opMetrics.hitRate,
            avgLatencyMs: opMetrics.avgLatencyMs,
        });
    }

    return {
        hitRate,
        missRate,
        totalRequests: total,
        averageLatency: avgLatency,
    };
}

/**
 * Get connection pool metrics
 */
function getConnectionPoolMetrics(): AggregatedMetrics["connectionPool"] {
    return poolMonitor.getPoolStats();
}

/**
 * Get rate limiting metrics
 */
async function getRateLimitMetrics() {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const metrics = await redis.get<{
            total?: number;
            blocked?: number;
        }>("metrics:rate_limit");

        if (!metrics) {
            return;
        }

        const total = metrics.total || 0;
        const blocked = metrics.blocked || 0;
        const blockRate = total > 0 ? blocked / total : 0;

        // Record to New Relic
        recordMetric("Custom/RateLimit/TotalRequests", total);
        recordMetric("Custom/RateLimit/BlockedRequests", blocked);
        recordMetric("Custom/RateLimit/BlockRate", blockRate);

        return {
            totalRequests: total,
            blockedRequests: blocked,
            blockRate,
        };
    } catch (error) {
        noticeNewRelicError(
            error instanceof Error ? error : new Error(String(error)),
            {
                component: "rate_limit",
                operation: "get_metrics",
            }
        );
        return;
    }
}

/**
 * Get deduplication metrics
 */
async function getDeduplicationMetrics() {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }

    try {
        const metrics = await redis.get<{
            duplicates?: number;
            cacheHits?: number;
            total?: number;
        }>("metrics:deduplication");

        if (!metrics) {
            return;
        }

        const duplicates = metrics.duplicates || 0;
        const cacheHits = metrics.cacheHits || 0;
        const total = metrics.total || 0;
        const savingsPercent = total > 0 ? (duplicates / total) * 100 : 0;

        // Record to New Relic
        recordMetric("Custom/Deduplication/DuplicatesDetected", duplicates);
        recordMetric("Custom/Deduplication/CacheHits", cacheHits);
        recordMetric("Custom/Deduplication/SavingsPercent", savingsPercent);

        return {
            duplicatesDetected: duplicates,
            cacheHits,
            savingsPercent,
        };
    } catch (error) {
        noticeNewRelicError(
            error instanceof Error ? error : new Error(String(error)),
            {
                component: "deduplication",
                operation: "get_metrics",
            }
        );
        return;
    }
}

/**
 * Aggregate all system metrics
 */
async function aggregateMetrics(): Promise<AggregatedMetrics> {
    const [cache, rateLimit, deduplication] = await Promise.all([
        getCacheMetrics(),
        getRateLimitMetrics(),
        getDeduplicationMetrics(),
    ]);

    return {
        database: getDatabaseMetrics(),
        cache,
        connectionPool: getConnectionPoolMetrics(),
        rateLimit,
        deduplication,
    };
}

/**
 * Calculate overall system health status
 */
function calculateOverallStatus(components: {
    cache: ComponentHealth;
    connectionPool: ComponentHealth;
}): HealthStatus {
    const statuses = [
        components.cache.status,
        components.connectionPool.status,
    ];

    if (statuses.includes("critical")) {
        return "critical";
    }

    if (statuses.includes("degraded")) {
        return "degraded";
    }

    return "healthy";
}

/**
 * Get complete system health report with New Relic integration
 *
 * @example
 * ```typescript
 * // app/api/health/route.ts
 * import { getSystemHealth } from "@/lib/monitoring/dashboard";
 *
 * export async function GET() {
 *   const health = await getSystemHealth();
 *
 *   const statusCode = health.status === "healthy" ? 200 :
 *                      health.status === "degraded" ? 503 : 500;
 *
 *   return Response.json(health, { status: statusCode });
 * }
 * ```
 */
export async function getSystemHealth(): Promise<SystemHealth> {
    const healthCheckStart = Date.now();

    try {
        const [cache, metrics] = await Promise.all([
            checkCacheHealth(),
            aggregateMetrics(),
        ]);

        const connectionPool = checkConnectionPoolHealth();
        const components = { cache, connectionPool };
        const status = calculateOverallStatus(components);
        const uptime = Date.now() - startTime;

        const health: SystemHealth = {
            status,
            timestamp: new Date().toISOString(),
            uptime,
            components,
            metrics,
        };

        // Record overall health to New Relic
        recordEvent("SystemHealthCheck", {
            status,
            uptime,
            cacheStatus: cache.status,
            poolStatus: connectionPool.status,
            cacheHitRate: metrics.cache.hitRate,
            poolActive: metrics.connectionPool.active,
            poolIdle: metrics.connectionPool.idle,
            poolWaiting: metrics.connectionPool.waiting,
            poolMax: metrics.connectionPool.max,
            poolTotal: metrics.connectionPool.total,
        });

        // Add attributes to current transaction
        addAttributes({
            "health.status": status,
            "health.cacheStatus": cache.status,
            "health.poolStatus": connectionPool.status,
            "health.cacheHitRate": metrics.cache.hitRate,
        });

        const duration = Date.now() - healthCheckStart;
        recordMetric("Custom/HealthCheck/Duration", duration);

        return health;
    } catch (error) {
        noticeNewRelicError(
            error instanceof Error ? error : new Error(String(error)),
            {
                component: "system_health",
                operation: "get_health",
            }
        );
        throw error;
    }
}

/**
 * Export metrics in Prometheus format (for backwards compatibility)
 */
export async function exportPrometheusMetrics(): Promise<string> {
    const health = await getSystemHealth();
    const lines: string[] = [];

    // System health
    lines.push(
        "# HELP system_health_status Overall system health (0=healthy, 1=degraded, 2=critical)"
    );
    lines.push("# TYPE system_health_status gauge");
    const healthValue =
        health.status === "healthy" ? 0 : health.status === "degraded" ? 1 : 2;
    lines.push(`system_health_status ${healthValue}`);

    // Database metrics
    lines.push("# HELP db_queries_total Total database queries");
    lines.push("# TYPE db_queries_total counter");
    lines.push(`db_queries_total ${health.metrics.database.totalQueries}`);

    lines.push(
        "# HELP db_query_duration_ms Average query duration in milliseconds"
    );
    lines.push("# TYPE db_query_duration_ms gauge");
    lines.push(
        `db_query_duration_ms ${health.metrics.database.averageQueryDuration}`
    );

    // Cache metrics
    lines.push("# HELP cache_hit_rate Cache hit rate (0-1)");
    lines.push("# TYPE cache_hit_rate gauge");
    lines.push(`cache_hit_rate ${health.metrics.cache.hitRate}`);

    lines.push("# HELP cache_requests_total Total cache requests");
    lines.push("# TYPE cache_requests_total counter");
    lines.push(`cache_requests_total ${health.metrics.cache.totalRequests}`);

    // Connection pool
    lines.push("# HELP pool_connections_active Active database connections");
    lines.push("# TYPE pool_connections_active gauge");
    lines.push(
        `pool_connections_active ${health.metrics.connectionPool.active}`
    );

    return `${lines.join("\n")}\n`;
}

/**
 * Get metrics summary for logging/alerts
 */
export async function getMetricsSummary(): Promise<{
    healthy: boolean;
    warnings: string[];
    critical: string[];
    stats: Record<string, number>;
}> {
    const health = await getSystemHealth();
    const warnings: string[] = [];
    const critical: string[] = [];

    // Check each component
    if (health.components.cache.status === "degraded") {
        warnings.push(`Cache: ${health.components.cache.message}`);
    } else if (health.components.cache.status === "critical") {
        critical.push(`Cache: ${health.components.cache.message}`);
    }

    if (health.components.connectionPool.status === "degraded") {
        warnings.push(`Pool: ${health.components.connectionPool.message}`);
    } else if (health.components.connectionPool.status === "critical") {
        critical.push(`Pool: ${health.components.connectionPool.message}`);
    }

    const summary = {
        healthy: health.status === "healthy",
        warnings,
        critical,
        stats: {
            uptime: health.uptime,
            queries: health.metrics.database.totalQueries,
            cacheHitRate: health.metrics.cache.hitRate,
            activeConnections: health.metrics.connectionPool.active,
        },
    };

    // Record summary event to New Relic
    if (!summary.healthy) {
        recordEvent("SystemHealthAlert", {
            healthy: summary.healthy,
            warningCount: warnings.length,
            criticalCount: critical.length,
            warnings: warnings.join(", "),
            critical: critical.join(", "),
        });
    }

    return summary;
}

/**
 * Track custom metric for any operation
 * Convenience wrapper for New Relic custom metrics
 *
 * @example
 * ```typescript
 * trackMetric("ChatCompletion", 150); // 150ms response time
 * trackMetric("ImageGeneration", 3500);
 * ```
 */
export function trackMetric(name: string, value: number, unit?: string) {
    const metricName = unit ? `Custom/${name}/${unit}` : `Custom/${name}`;
    recordMetric(metricName, value);
}

/**
 * Track custom event for any operation
 * Convenience wrapper for New Relic custom events
 *
 * @example
 * ```typescript
 * trackEvent("UserAction", {
 *   action: "create_chat",
 *   userId: "123",
 *   model: "gpt-4",
 *   success: true
 * });
 * ```
 */
export function trackEvent(
    eventType: string,
    attributes: Record<string, string | number | boolean>
) {
    recordEvent(eventType, attributes);
}

/**
 * Start a custom segment for detailed timing
 * Returns a function to end the segment
 *
 * @example
 * ```typescript
 * const endSegment = startSegment("DatabaseQuery", "SELECT * FROM users");
 * try {
 *   const result = await db.query("SELECT * FROM users");
 *   return result;
 * } finally {
 *   endSegment();
 * }
 * ```
 */
export function startSegment(name: string, category?: string): () => void {
    const newrelic = getNewRelicAgent();
    if (!newrelic) {
        // No-op if New Relic not available
        return () => {
            // No operation
        };
    }

    const segmentStartTime = Date.now();
    const segmentName = category ? `${category}/${name}` : name;

    return () => {
        const duration = Date.now() - segmentStartTime;
        recordMetric(`Custom/Segment/${segmentName}`, duration);
    };
}

/**
 * Wrap async function with New Relic transaction
 *
 * @example
 * ```typescript
 * export const POST = withNewRelicTransaction(
 *   "API/chat",
 *   async (request: Request) => {
 *     // Your handler code
 *     return Response.json(result);
 *   }
 * );
 * ```
 */
export function withNewRelicTransaction<T>(
    name: string,
    handler: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<T> {
    return async (...args: unknown[]) => {
        const newrelic = getNewRelicAgent();

        if (!newrelic) {
            // If New Relic not available, just run handler
            return handler(...args);
        }

        const transactionStart = Date.now();

        try {
            const result = await handler(...args);
            const duration = Date.now() - transactionStart;

            recordMetric(`Custom/Transaction/${name}`, duration);
            recordEvent("TransactionComplete", {
                name,
                duration,
                success: true,
            });

            return result;
        } catch (error) {
            const duration = Date.now() - transactionStart;

            noticeNewRelicError(
                error instanceof Error ? error : new Error(String(error)),
                {
                    transaction: name,
                    duration,
                }
            );

            recordEvent("TransactionComplete", {
                name,
                duration,
                success: false,
                error: String(error),
            });

            throw error;
        }
    };
}

/**
 * Track AI/LLM completion metrics
 * Records model usage, token counts, and response times to New Relic
 *
 * @example
 * ```typescript
 * trackAICompletion({
 *   model: "gpt-4",
 *   provider: "openai",
 *   promptTokens: 150,
 *   completionTokens: 300,
 *   totalTokens: 450,
 *   durationMs: 1250,
 *   success: true
 * });
 * ```
 */
export function trackAICompletion(params: {
    model: string;
    provider?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    durationMs: number;
    success: boolean;
    isStreaming?: boolean;
    firstTokenMs?: number;
    chatId?: string;
    userId?: string;
}) {
    // Record metrics
    recordMetric("Custom/AI/CompletionDuration", params.durationMs);
    if (params.totalTokens) {
        recordMetric("Custom/AI/TotalTokens", params.totalTokens);
    }
    if (params.promptTokens) {
        recordMetric("Custom/AI/PromptTokens", params.promptTokens);
    }
    if (params.completionTokens) {
        recordMetric("Custom/AI/CompletionTokens", params.completionTokens);
    }
    if (params.firstTokenMs) {
        recordMetric("Custom/AI/TimeToFirstToken", params.firstTokenMs);
    }

    // Record event with full details
    recordEvent("AICompletion", {
        model: params.model,
        provider: params.provider || "unknown",
        promptTokens: params.promptTokens || 0,
        completionTokens: params.completionTokens || 0,
        totalTokens: params.totalTokens || 0,
        durationMs: params.durationMs,
        success: params.success,
        isStreaming: params.isStreaming || false,
        firstTokenMs: params.firstTokenMs || 0,
        tokensPerSecond:
            params.completionTokens && params.durationMs > 0
                ? Math.round(
                      (params.completionTokens / params.durationMs) * 1000
                  )
                : 0,
    });

    // Add to current transaction
    addAttributes({
        "ai.model": params.model,
        "ai.provider": params.provider || "unknown",
        "ai.totalTokens": params.totalTokens || 0,
        "ai.durationMs": params.durationMs,
    });
}

/**
 * Track streaming-specific metrics for AI completions
 *
 * @example
 * ```typescript
 * trackStreamingMetrics({
 *   model: "gpt-4",
 *   firstTokenMs: 150,
 *   totalDurationMs: 3500,
 *   chunkCount: 45,
 *   totalTokens: 300
 * });
 * ```
 */
export function trackStreamingMetrics(params: {
    model: string;
    firstTokenMs: number;
    totalDurationMs: number;
    chunkCount?: number;
    totalTokens?: number;
}) {
    recordMetric("Custom/AI/Streaming/TimeToFirstToken", params.firstTokenMs);
    recordMetric("Custom/AI/Streaming/TotalDuration", params.totalDurationMs);

    if (params.chunkCount) {
        recordMetric("Custom/AI/Streaming/ChunkCount", params.chunkCount);
    }

    recordEvent("AIStreamingCompletion", {
        model: params.model,
        firstTokenMs: params.firstTokenMs,
        totalDurationMs: params.totalDurationMs,
        chunkCount: params.chunkCount || 0,
        totalTokens: params.totalTokens || 0,
        streamingEfficiency:
            params.firstTokenMs > 0
                ? params.totalDurationMs / params.firstTokenMs
                : 0,
    });
}

/**
 * Report per-request metrics to New Relic
 * Call this at the end of request handlers to send aggregated DB/cache stats
 *
 * @example
 * ```typescript
 * // At end of API handler
 * reportRequestMetrics("POST /api/chat", {
 *   dbCalls: 3,
 *   dbTotalDurationMs: 150,
 *   cacheCalls: 5,
 *   cacheHits: 4,
 *   cacheMisses: 1,
 *   cacheTotalDurationMs: 25
 * });
 * ```
 */
export function reportRequestMetrics(
    routeName: string,
    metrics: {
        dbCalls: number;
        dbTotalDurationMs: number;
        cacheCalls: number;
        cacheHits: number;
        cacheMisses: number;
        cacheTotalDurationMs: number;
    }
) {
    // Record individual metrics
    recordMetric("Custom/Request/DBCalls", metrics.dbCalls);
    recordMetric("Custom/Request/DBDurationMs", metrics.dbTotalDurationMs);
    recordMetric("Custom/Request/CacheCalls", metrics.cacheCalls);
    recordMetric("Custom/Request/CacheHits", metrics.cacheHits);
    recordMetric("Custom/Request/CacheMisses", metrics.cacheMisses);
    recordMetric(
        "Custom/Request/CacheDurationMs",
        metrics.cacheTotalDurationMs
    );

    const cacheHitRate =
        metrics.cacheCalls > 0 ? metrics.cacheHits / metrics.cacheCalls : 0;

    // Record event with full context
    recordEvent("RequestMetrics", {
        route: routeName,
        dbCalls: metrics.dbCalls,
        dbTotalDurationMs: metrics.dbTotalDurationMs,
        dbAvgDurationMs:
            metrics.dbCalls > 0
                ? Math.round(metrics.dbTotalDurationMs / metrics.dbCalls)
                : 0,
        cacheCalls: metrics.cacheCalls,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        cacheTotalDurationMs: metrics.cacheTotalDurationMs,
        cacheHitRate,
    });

    // Add to current transaction
    addAttributes({
        "request.dbCalls": metrics.dbCalls,
        "request.cacheCalls": metrics.cacheCalls,
        "request.cacheHitRate": cacheHitRate,
    });

    // Report aggregate cache operation metrics periodically (fire-and-forget)
    // This ensures CacheOperationMetrics events are sent even without health checks
    maybeReportCacheOperationMetrics().catch(() => {
        // Silently ignore errors - don't disrupt request handling
    });
}

// Track when we last reported cache operation metrics
let lastCacheMetricsReport = 0;
const CACHE_METRICS_REPORT_INTERVAL_MS = 60_000; // Report every 60 seconds max

/**
 * Report cache operation metrics if enough time has passed since last report
 * This ensures metrics are sent even without explicit health check calls
 */
async function maybeReportCacheOperationMetrics(): Promise<void> {
    const now = Date.now();
    if (now - lastCacheMetricsReport < CACHE_METRICS_REPORT_INTERVAL_MS) {
        return; // Too soon since last report
    }
    lastCacheMetricsReport = now;

    try {
        await reportCacheOperationMetrics();
    } catch {
        // Silently ignore errors - don't disrupt request handling
    }
}

/**
 * Report aggregate cache operation metrics to New Relic
 * Can be called independently of health checks for more frequent metric updates
 *
 * @example
 * ```typescript
 * // Call periodically or at end of important operations
 * await reportCacheOperationMetrics();
 * ```
 */
export async function reportCacheOperationMetrics(): Promise<void> {
    // Import CacheMetrics dynamically to avoid circular dependency
    const { CacheMetrics } = await import("@/lib/cache/metrics");

    const summary = CacheMetrics.getSummary();

    // Record per-operation metrics as CacheOperationMetrics events
    for (const [operation, opMetrics] of Object.entries(summary)) {
        recordEvent("CacheOperationMetrics", {
            operation,
            hits: opMetrics.hits,
            misses: opMetrics.misses,
            errors: opMetrics.errors,
            hitRate: opMetrics.hitRate,
            avgLatencyMs: opMetrics.avgLatencyMs,
        });
    }

    // Also record aggregate custom metrics
    let totalHits = 0;
    let totalMisses = 0;
    let totalErrors = 0;

    for (const opMetrics of Object.values(summary)) {
        totalHits += opMetrics.hits;
        totalMisses += opMetrics.misses;
        totalErrors += opMetrics.errors;
    }

    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? totalHits / total : 0;

    recordMetric("Custom/Cache/HitRate", hitRate);
    recordMetric("Custom/Cache/Hits", totalHits);
    recordMetric("Custom/Cache/Misses", totalMisses);
    recordMetric("Custom/Cache/Errors", totalErrors);
}

/**
 * Track user action for analytics
 *
 * @example
 * ```typescript
 * trackUserAction("create_chat", {
 *   userId: "123",
 *   model: "gpt-4",
 *   hasAttachments: true
 * });
 * ```
 */
export function trackUserAction(
    action: string,
    attributes: Record<string, string | number | boolean>
) {
    recordEvent("UserAction", {
        action,
        timestamp: Date.now(),
        ...attributes,
    });
}

/**
 * Track chat operations for detailed observability in New Relic
 * Creates ChatOperation custom event with comprehensive attributes
 *
 * @example
 * ```typescript
 * trackChatOperation("request_started", {
 *   chatId: "123",
 *   userId: "user-456",
 *   modelId: "gpt-4",
 *   isNewChat: true
 * });
 *
 * trackChatOperation("request_completed", {
 *   chatId: "123",
 *   userId: "user-456",
 *   modelId: "gpt-4",
 *   durationMs: 1500,
 *   dbCalls: 3,
 *   cacheHits: 2
 * });
 * ```
 */
export function trackChatOperation(
    operation:
        | "request_started"
        | "request_completed"
        | "request_failed"
        | "message_saved"
        | "title_generated",
    attributes: {
        chatId: string;
        userId?: string;
        modelId?: string;
        isNewChat?: boolean;
        durationMs?: number;
        dbCalls?: number;
        cacheHits?: number;
        cacheMisses?: number;
        errorCode?: string;
        errorMessage?: string;
        [key: string]: string | number | boolean | undefined;
    }
) {
    // Filter out undefined values and ensure type safety
    const safeAttributes: Record<string, string | number | boolean> = {
        operation,
        timestamp: Date.now(),
    };

    for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
            safeAttributes[key] = value;
        }
    }

    recordEvent("ChatOperation", safeAttributes);

    // Also record as metric if duration is present
    if (attributes.durationMs !== undefined) {
        recordMetric(
            `Custom/Chat/${operation}/Duration`,
            attributes.durationMs
        );
    }
}
