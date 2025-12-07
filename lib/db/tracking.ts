import "server-only";

import { trace } from "@opentelemetry/api";
import { logWarn } from "@/lib/log";

/**
 * ==============================================================================
 * DATABASE QUERY PERFORMANCE TRACKING
 * ==============================================================================
 *
 * Tracks database query performance with OpenTelemetry integration.
 * Automatically detects slow queries and records metrics.
 *
 * Features:
 * - Query duration tracking
 * - Slow query detection
 * - OpenTelemetry span attributes
 * - Automatic error recording
 */

// Configuration
const SLOW_QUERY_THRESHOLD_MS = 100; // Warn on queries taking > 100ms
const VERY_SLOW_QUERY_THRESHOLD_MS = 500; // Critical threshold

type QueryMetrics = {
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
};

/**
 * Wrap a database query with performance tracking
 *
 * @param operation Human-readable operation name (e.g., "get_chat_by_id")
 * @param queryFn The async database query function to execute
 * @returns Query result
 */
export async function trackQuery<T>(
    operation: string,
    queryFn: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    const span = trace.getActiveSpan();

    // Add operation name to span
    if (span) {
        span.setAttribute("db.operation", operation);
    }

    try {
        const result = await queryFn();
        const duration = performance.now() - start;

        // Record metrics
        const metrics: QueryMetrics = {
            operation,
            duration,
            success: true,
        };

        // Add to OpenTelemetry span
        if (span) {
            span.setAttribute("db.duration_ms", duration);
            span.setAttribute("db.success", true);
        }

        // Warn on slow queries
        if (duration > VERY_SLOW_QUERY_THRESHOLD_MS) {
            logWarn(`Very slow query detected: ${operation}`, metrics);
        } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logWarn(`Slow query detected: ${operation}`, metrics);
        }

        return result;
    } catch (error) {
        const duration = performance.now() - start;

        // Record error metrics
        const metrics: QueryMetrics = {
            operation,
            duration,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };

        // Add to OpenTelemetry span
        if (span) {
            span.setAttribute("db.duration_ms", duration);
            span.setAttribute("db.success", false);
            span.recordException(error as Error);
        }

        logWarn(`Query failed: ${operation}`, metrics);
        throw error;
    }
}

/**
 * Batch query tracker for operations that execute multiple queries
 *
 * @param operation Human-readable operation name
 * @param queryFns Array of query functions to execute in parallel
 * @returns Array of query results
 */
export async function trackBatchQueries<T>(
    operation: string,
    queryFns: Array<() => Promise<T>>
): Promise<T[]> {
    const start = performance.now();
    const span = trace.getActiveSpan();

    if (span) {
        span.setAttribute("db.operation", operation);
        span.setAttribute("db.batch_size", queryFns.length);
    }

    try {
        const results = await Promise.all(
            queryFns.map((fn, index) =>
                trackQuery(`${operation}[${index}]`, fn)
            )
        );

        const duration = performance.now() - start;

        if (span) {
            span.setAttribute("db.batch_duration_ms", duration);
        }

        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logWarn(`Slow batch query detected: ${operation}`, {
                operation,
                duration,
                batchSize: queryFns.length,
            });
        }

        return results;
    } catch (error) {
        if (span) {
            span.recordException(error as Error);
        }
        throw error;
    }
}
