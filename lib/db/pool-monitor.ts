import "server-only";

import { trace } from "@opentelemetry/api";
import { logError, logWarn } from "@/lib/log";

/**
 * ==============================================================================
 * CONNECTION POOL MONITORING
 * ==============================================================================
 *
 * Provides monitoring and metrics for PostgreSQL connection pools.
 * Helps identify connection leaks, pool exhaustion, and performance issues.
 *
 * Features:
 * - Connection pool metrics (idle, active, waiting)
 * - Query duration tracking
 * - Connection leak detection
 * - Pool exhaustion alerts
 * - OpenTelemetry integration
 *
 * Metrics exported:
 * - db.pool.size.idle: Number of idle connections
 * - db.pool.size.active: Number of active connections
 * - db.pool.size.waiting: Number of queries waiting for connection
 * - db.pool.connection.duration_ms: Time connection held
 * - db.pool.query.duration_ms: Query execution time
 */

export type PoolStats = {
    idle: number;
    active: number;
    waiting: number;
    max: number;
    total: number;
};

export type ConnectionMetrics = {
    acquired: number;
    released: number;
    created: number;
    destroyed: number;
    timeouts: number;
    errors: number;
};

class ConnectionPoolMonitor {
    private readonly poolStats: PoolStats = {
        idle: 0,
        active: 0,
        waiting: 0,
        max: 0,
        total: 0,
    };

    private connectionMetrics: ConnectionMetrics = {
        acquired: 0,
        released: 0,
        created: 0,
        destroyed: 0,
        timeouts: 0,
        errors: 0,
    };

    private readonly activeConnections = new Map<
        string,
        {
            acquiredAt: number;
            query?: string;
        }
    >();

    private queryHistory: Array<{
        query: string;
        duration: number;
        timestamp: number;
    }> = [];

    private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
    private readonly CONNECTION_HOLD_WARNING = 5000; // 5 seconds
    private readonly HISTORY_SIZE = 100;

    /**
     * Record connection acquisition
     */
    onConnectionAcquired(connectionId: string) {
        this.connectionMetrics.acquired++;
        this.poolStats.active++;
        this.poolStats.idle = Math.max(0, this.poolStats.idle - 1);

        this.activeConnections.set(connectionId, {
            acquiredAt: Date.now(),
        });

        this.emitMetrics();
    }

    /**
     * Record connection release
     */
    onConnectionReleased(connectionId: string) {
        this.connectionMetrics.released++;
        this.poolStats.active = Math.max(0, this.poolStats.active - 1);
        this.poolStats.idle++;

        const conn = this.activeConnections.get(connectionId);
        if (conn) {
            const holdDuration = Date.now() - conn.acquiredAt;

            // Warn about long-held connections (potential leak)
            if (holdDuration > this.CONNECTION_HOLD_WARNING) {
                logWarn(`Connection held for ${holdDuration}ms`, {
                    query: conn.query || "unknown query",
                    holdDurationMs: holdDuration,
                    potentialLeak: true,
                });
            }

            const span = trace.getActiveSpan();
            if (span) {
                span.setAttribute(
                    "db.pool.connection.duration_ms",
                    holdDuration
                );
            }

            this.activeConnections.delete(connectionId);
        }

        this.emitMetrics();
    }

    /**
     * Record connection creation
     */
    onConnectionCreated() {
        this.connectionMetrics.created++;
        this.poolStats.total++;
        this.poolStats.idle++;
        this.emitMetrics();
    }

    /**
     * Record connection destruction
     */
    onConnectionDestroyed() {
        this.connectionMetrics.destroyed++;
        this.poolStats.total = Math.max(0, this.poolStats.total - 1);
        this.emitMetrics();
    }

    /**
     * Record connection timeout
     */
    onConnectionTimeout() {
        this.connectionMetrics.timeouts++;
        logError(
            "Connection pool timeout",
            new Error("Connection acquisition timeout")
        );
        this.emitMetrics();
    }

    /**
     * Record connection error
     */
    onConnectionError(error: Error) {
        this.connectionMetrics.errors++;
        logError("Connection pool error", error);
        this.emitMetrics();
    }

    /**
     * Record query execution
     */
    onQueryExecuted(connectionId: string, query: string, duration: number) {
        const conn = this.activeConnections.get(connectionId);
        if (conn) {
            conn.query = query;
        }

        // Track in history
        this.queryHistory.push({
            query,
            duration,
            timestamp: Date.now(),
        });

        // Trim history
        if (this.queryHistory.length > this.HISTORY_SIZE) {
            this.queryHistory.shift();
        }

        // Warn about slow queries
        if (duration > this.SLOW_QUERY_THRESHOLD) {
            logWarn(`Slow query detected: ${duration}ms`, {
                query: query.substring(0, 100),
                durationMs: duration,
            });
        }

        const span = trace.getActiveSpan();
        if (span) {
            span.setAttribute("db.pool.query.duration_ms", duration);
            span.setAttribute(
                "db.pool.query.slow",
                duration > this.SLOW_QUERY_THRESHOLD
            );
        }
    }

    /**
     * Update pool size configuration
     */
    updatePoolSize(max: number) {
        this.poolStats.max = max;
        this.emitMetrics();
    }

    /**
     * Record waiting query
     */
    onQueryWaiting() {
        this.poolStats.waiting++;
        this.emitMetrics();
    }

    /**
     * Record query no longer waiting
     */
    onQueryStarted() {
        this.poolStats.waiting = Math.max(0, this.poolStats.waiting - 1);
        this.emitMetrics();
    }

    /**
     * Get current pool statistics
     */
    getPoolStats(): PoolStats {
        return { ...this.poolStats };
    }

    /**
     * Get connection metrics
     */
    getConnectionMetrics(): ConnectionMetrics {
        return { ...this.connectionMetrics };
    }

    /**
     * Get slow queries from recent history
     */
    getSlowQueries(threshold: number = this.SLOW_QUERY_THRESHOLD) {
        return this.queryHistory
            .filter((q) => q.duration > threshold)
            .slice(-20);
    }

    /**
     * Get active connection info
     */
    getActiveConnections() {
        const now = Date.now();
        return Array.from(this.activeConnections.entries()).map(
            ([id, conn]) => ({
                id,
                heldFor: now - conn.acquiredAt,
                query: conn.query,
            })
        );
    }

    /**
     * Check for connection leaks
     */
    checkForLeaks() {
        const now = Date.now();
        const leaks: Array<{ id: string; duration: number; query?: string }> =
            [];

        for (const [id, conn] of this.activeConnections.entries()) {
            const duration = now - conn.acquiredAt;
            if (duration > this.CONNECTION_HOLD_WARNING) {
                leaks.push({
                    id,
                    duration,
                    query: conn.query,
                });
            }
        }

        return leaks;
    }

    /**
     * Get pool health status
     */
    getHealthStatus() {
        const utilizationPercent =
            this.poolStats.max > 0
                ? (this.poolStats.active / this.poolStats.max) * 100
                : 0;

        const hasLeaks = this.checkForLeaks().length > 0;
        const hasTimeouts = this.connectionMetrics.timeouts > 0;
        const hasErrors = this.connectionMetrics.errors > 0;

        let status: "healthy" | "warning" | "critical";

        if (hasLeaks || utilizationPercent > 90) {
            status = "critical";
        } else if (hasTimeouts || hasErrors || utilizationPercent > 70) {
            status = "warning";
        } else {
            status = "healthy";
        }

        return {
            status,
            utilizationPercent,
            poolStats: this.getPoolStats(),
            metrics: this.getConnectionMetrics(),
            warnings: {
                hasLeaks,
                hasTimeouts,
                hasErrors,
                highUtilization: utilizationPercent > 70,
            },
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    reset() {
        this.connectionMetrics = {
            acquired: 0,
            released: 0,
            created: 0,
            destroyed: 0,
            timeouts: 0,
            errors: 0,
        };
        this.activeConnections.clear();
        this.queryHistory = [];
    }

    /**
     * Emit metrics to OpenTelemetry
     */
    private emitMetrics() {
        const span = trace.getActiveSpan();
        if (!span) {
            return;
        }

        span.setAttribute("db.pool.size.idle", this.poolStats.idle);
        span.setAttribute("db.pool.size.active", this.poolStats.active);
        span.setAttribute("db.pool.size.waiting", this.poolStats.waiting);
        span.setAttribute("db.pool.size.max", this.poolStats.max);
        span.setAttribute("db.pool.size.total", this.poolStats.total);

        span.setAttribute(
            "db.pool.metrics.acquired",
            this.connectionMetrics.acquired
        );
        span.setAttribute(
            "db.pool.metrics.released",
            this.connectionMetrics.released
        );
        span.setAttribute(
            "db.pool.metrics.timeouts",
            this.connectionMetrics.timeouts
        );
        span.setAttribute(
            "db.pool.metrics.errors",
            this.connectionMetrics.errors
        );
    }
}

// Singleton instance
export const poolMonitor = new ConnectionPoolMonitor();

/**
 * Wrap a database operation with connection monitoring
 *
 * @example
 * ```typescript
 * await withConnectionMonitoring(
 *   "query_users",
 *   async (connectionId) => {
 *     const result = await db.select().from(users);
 *     poolMonitor.onQueryExecuted(connectionId, "SELECT * FROM users", Date.now() - start);
 *     return result;
 *   }
 * );
 * ```
 */
export async function withConnectionMonitoring<T>(
    operationName: string,
    operation: (connectionId: string) => Promise<T>
): Promise<T> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const start = Date.now();

    poolMonitor.onQueryWaiting();

    try {
        poolMonitor.onConnectionAcquired(connectionId);
        poolMonitor.onQueryStarted();

        const result = await operation(connectionId);

        const duration = Date.now() - start;
        poolMonitor.onQueryExecuted(connectionId, operationName, duration);

        return result;
    } catch (error) {
        poolMonitor.onConnectionError(error as Error);
        throw error;
    } finally {
        poolMonitor.onConnectionReleased(connectionId);
    }
}
