/**
 * API Metrics Collection
 *
 * Lightweight, non-blocking metrics collection for API endpoints.
 * Uses a ring buffer for memory-efficient storage.
 *
 * Features:
 * - Request count per endpoint
 * - Response times (p50, p95, p99)
 * - Error rates
 * - Status code distribution
 * - Response time logging (P3-071)
 *
 * @module lib/middleware/metrics
 * @see P2-031, P3-071
 */

import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Individual API metric record
 */
export interface ApiMetric {
    /** API endpoint path */
    endpoint: string;
    /** HTTP method */
    method: string;
    /** HTTP status code */
    statusCode: number;
    /** Request duration in milliseconds */
    duration: number;
    /** Timestamp of the request */
    timestamp: Date;
}

/**
 * Aggregated metrics for an endpoint
 */
export interface EndpointMetrics {
    /** Total request count */
    requestCount: number;
    /** Error count (4xx, 5xx) */
    errorCount: number;
    /** Error rate (0-1) */
    errorRate: number;
    /** Status code distribution */
    statusCodes: Record<number, number>;
    /** Response time percentiles in ms */
    latency: {
        p50: number;
        p95: number;
        p99: number;
        avg: number;
        min: number;
        max: number;
    };
}

/**
 * Complete metrics snapshot
 */
export interface MetricsSnapshot {
    /** Collection start time */
    startTime: Date;
    /** Snapshot generation time */
    snapshotTime: Date;
    /** Total requests across all endpoints */
    totalRequests: number;
    /** Total errors across all endpoints */
    totalErrors: number;
    /** Overall error rate */
    overallErrorRate: number;
    /** Metrics per endpoint */
    endpoints: Record<string, EndpointMetrics>;
    /** Global latency percentiles */
    globalLatency: {
        p50: number;
        p95: number;
        p99: number;
        avg: number;
    };
    /** Buffer info */
    buffer: {
        size: number;
        capacity: number;
        utilizationPercent: number;
    };
}

/**
 * Metrics configuration options
 */
export interface MetricsConfig {
    /** Ring buffer capacity (default: 10000) */
    bufferSize?: number;
    /** Whether to enable metrics collection (default: true) */
    enabled?: boolean;
}

// =============================================================================
// RING BUFFER IMPLEMENTATION
// =============================================================================

/**
 * Fixed-size ring buffer for memory-efficient metric storage.
 * Overwrites oldest entries when full.
 */
class RingBuffer<T> {
    private readonly buffer: (T | undefined)[];
    private writeIndex = 0;
    private count = 0;

    constructor(private readonly capacity: number) {
        this.buffer = new Array(capacity);
    }

    /**
     * Add an item to the buffer (O(1))
     */
    push(item: T): void {
        this.buffer[this.writeIndex] = item;
        this.writeIndex = (this.writeIndex + 1) % this.capacity;
        if (this.count < this.capacity) {
            this.count++;
        }
    }

    /**
     * Get all items in insertion order (O(n))
     */
    toArray(): T[] {
        if (this.count === 0) {
            return [];
        }

        const result: T[] = [];
        const startIndex = this.count < this.capacity ? 0 : this.writeIndex;

        for (let i = 0; i < this.count; i++) {
            const index = (startIndex + i) % this.capacity;
            const item = this.buffer[index];
            if (item !== undefined) {
                result.push(item);
            }
        }

        return result;
    }

    /**
     * Get current item count
     */
    size(): number {
        return this.count;
    }

    /**
     * Get buffer capacity
     */
    getCapacity(): number {
        return this.capacity;
    }

    /**
     * Clear all items
     */
    clear(): void {
        this.buffer.fill(undefined);
        this.writeIndex = 0;
        this.count = 0;
    }
}

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

const DEFAULT_BUFFER_SIZE = 10_000;

/** Singleton metrics state */
let metricsBuffer: RingBuffer<ApiMetric>;
let metricsStartTime: Date;
let metricsEnabled: boolean;

/**
 * Initialize or reinitialize the metrics collector
 */
function ensureInitialized(config: MetricsConfig = {}): void {
    const { bufferSize = DEFAULT_BUFFER_SIZE, enabled = true } = config;

    if (!metricsBuffer) {
        metricsBuffer = new RingBuffer<ApiMetric>(bufferSize);
        metricsStartTime = new Date();
        metricsEnabled = enabled;
    }
}

// Auto-initialize on module load
ensureInitialized();

/**
 * Configure the metrics collector
 *
 * @example
 * ```ts
 * configureMetrics({ bufferSize: 5000, enabled: process.env.NODE_ENV !== 'test' });
 * ```
 */
export function configureMetrics(config: MetricsConfig): void {
    const { bufferSize = DEFAULT_BUFFER_SIZE, enabled = true } = config;

    metricsBuffer = new RingBuffer<ApiMetric>(bufferSize);
    metricsStartTime = new Date();
    metricsEnabled = enabled;
}

/**
 * Record an API metric (non-blocking)
 *
 * @example
 * ```ts
 * const start = Date.now();
 * const response = await handler(request);
 * recordApiMetric({
 *   endpoint: '/api/chat',
 *   method: 'POST',
 *   statusCode: response.status,
 *   duration: Date.now() - start,
 *   timestamp: new Date()
 * });
 * ```
 */
export function recordApiMetric(metric: ApiMetric): void {
    if (!metricsEnabled) {
        return;
    }
    ensureInitialized();

    // Non-blocking: use setImmediate/queueMicrotask for truly async recording
    // But since ring buffer push is O(1), direct call is fine
    metricsBuffer.push(metric);
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
        return 0;
    }
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

/**
 * Calculate metrics for a set of records
 */
function calculateEndpointMetrics(records: ApiMetric[]): EndpointMetrics {
    const requestCount = records.length;
    const errorCount = records.filter((r) => r.statusCode >= 400).length;

    const statusCodes: Record<number, number> = {};
    const durations: number[] = [];

    for (const record of records) {
        statusCodes[record.statusCode] =
            (statusCodes[record.statusCode] ?? 0) + 1;
        durations.push(record.duration);
    }

    // Sort durations for percentile calculation
    durations.sort((a, b) => a - b);

    const sum = durations.reduce((a, b) => a + b, 0);

    return {
        requestCount,
        errorCount,
        errorRate: requestCount > 0 ? errorCount / requestCount : 0,
        statusCodes,
        latency: {
            p50: percentile(durations, 50),
            p95: percentile(durations, 95),
            p99: percentile(durations, 99),
            avg: requestCount > 0 ? sum / requestCount : 0,
            min: durations[0] ?? 0,
            max: durations.at(-1) ?? 0,
        },
    };
}

/**
 * Get a snapshot of all collected metrics
 *
 * @example
 * ```ts
 * const metrics = getApiMetrics();
 * console.log(`Total requests: ${metrics.totalRequests}`);
 * console.log(`Error rate: ${(metrics.overallErrorRate * 100).toFixed(2)}%`);
 * console.log(`P99 latency: ${metrics.globalLatency.p99}ms`);
 * ```
 */
export function getApiMetrics(): MetricsSnapshot {
    ensureInitialized();

    const allRecords = metricsBuffer.toArray();
    const snapshotTime = new Date();

    // Group records by endpoint key (method + path)
    const endpointGroups: Record<string, ApiMetric[]> = {};

    for (const record of allRecords) {
        const key = `${record.method} ${record.endpoint}`;
        if (!endpointGroups[key]) {
            endpointGroups[key] = [];
        }
        endpointGroups[key].push(record);
    }

    // Calculate per-endpoint metrics
    const endpoints: Record<string, EndpointMetrics> = {};
    for (const [key, records] of Object.entries(endpointGroups)) {
        endpoints[key] = calculateEndpointMetrics(records);
    }

    // Calculate global metrics
    const totalRequests = allRecords.length;
    const totalErrors = allRecords.filter((r) => r.statusCode >= 400).length;
    const allDurations = allRecords
        .map((r) => r.duration)
        .sort((a, b) => a - b);
    const durationSum = allDurations.reduce((a, b) => a + b, 0);

    return {
        startTime: metricsStartTime,
        snapshotTime,
        totalRequests,
        totalErrors,
        overallErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
        endpoints,
        globalLatency: {
            p50: percentile(allDurations, 50),
            p95: percentile(allDurations, 95),
            p99: percentile(allDurations, 99),
            avg: totalRequests > 0 ? durationSum / totalRequests : 0,
        },
        buffer: {
            size: metricsBuffer.size(),
            capacity: metricsBuffer.getCapacity(),
            utilizationPercent:
                (metricsBuffer.size() / metricsBuffer.getCapacity()) * 100,
        },
    };
}

/**
 * Clear all collected metrics
 */
export function clearApiMetrics(): void {
    ensureInitialized();
    metricsBuffer.clear();
    metricsStartTime = new Date();
}

/**
 * Get raw metric records (for debugging/export)
 */
export function getRawMetrics(): ApiMetric[] {
    ensureInitialized();
    return metricsBuffer.toArray();
}

/**
 * Get current buffer size
 */
export function getMetricsBufferSize(): number {
    ensureInitialized();
    return metricsBuffer.size();
}

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Higher-order function to wrap an API handler with metrics collection
 *
 * @example
 * ```ts
 * // In your route.ts
 * import { withMetrics } from '@/lib/middleware/metrics';
 *
 * async function handler(request: Request): Promise<Response> {
 *   // your logic
 *   return new Response("OK");
 * }
 *
 * export const POST = withMetrics('/api/chat', handler);
 * ```
 */
export function withMetrics(
    endpoint: string,
    handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
        const start = performance.now();

        try {
            const response = await handler(request);
            const duration = performance.now() - start;

            recordApiMetric({
                endpoint,
                method: request.method,
                statusCode: response.status,
                duration,
                timestamp: new Date(),
            });

            // P3-071: Log API response time
            logger.info("[API Timing]", {
                endpoint,
                method: request.method,
                status: response.status,
                duration: `${duration.toFixed(2)}ms`,
            });

            return response;
        } catch (error) {
            const duration = performance.now() - start;

            // Record error as 500 if handler throws
            recordApiMetric({
                endpoint,
                method: request.method,
                statusCode: 500,
                duration,
                timestamp: new Date(),
            });

            // P3-071: Log API error with timing
            logger.error("[API Timing] Error", {
                endpoint,
                method: request.method,
                duration: `${duration.toFixed(2)}ms`,
                error,
            });

            throw error;
        }
    };
}

/**
 * Create a metrics recording function for manual use in routes
 *
 * @example
 * ```ts
 * const recordMetric = createMetricsRecorder('/api/chat');
 * const start = performance.now();
 * // ... handle request ...
 * recordMetric(request.method, response.status, performance.now() - start);
 * ```
 */
export function createMetricsRecorder(
    endpoint: string
): (method: string, statusCode: number, duration: number) => void {
    return (method: string, statusCode: number, duration: number) => {
        recordApiMetric({
            endpoint,
            method,
            statusCode,
            duration,
            timestamp: new Date(),
        });
    };
}

// =============================================================================
// EXPORT FOR MONITORING SYSTEMS
// =============================================================================

/**
 * Export metrics in Prometheus text format
 *
 * @example
 * ```ts
 * // In /api/metrics route
 * export function GET() {
 *   return new Response(exportPrometheusMetrics(), {
 *     headers: { 'Content-Type': 'text/plain' }
 *   });
 * }
 * ```
 */
export function exportPrometheusMetrics(): string {
    const metrics = getApiMetrics();
    const lines: string[] = [];

    // Help and type declarations
    lines.push("# HELP http_requests_total Total HTTP requests");
    lines.push("# TYPE http_requests_total counter");

    lines.push("# HELP http_request_duration_seconds HTTP request duration");
    lines.push("# TYPE http_request_duration_seconds histogram");

    lines.push("# HELP http_errors_total Total HTTP errors (4xx, 5xx)");
    lines.push("# TYPE http_errors_total counter");

    // Per-endpoint metrics
    for (const [endpointKey, endpointMetrics] of Object.entries(
        metrics.endpoints
    )) {
        const [method, ...pathParts] = endpointKey.split(" ");
        const path = pathParts.join(" ");
        const labels = `method="${method}",endpoint="${path}"`;

        lines.push(
            `http_requests_total{${labels}} ${endpointMetrics.requestCount}`
        );
        lines.push(
            `http_errors_total{${labels}} ${endpointMetrics.errorCount}`
        );

        // Duration quantiles (convert ms to seconds)
        lines.push(
            `http_request_duration_seconds{${labels},quantile="0.5"} ${(endpointMetrics.latency.p50 / 1000).toFixed(6)}`
        );
        lines.push(
            `http_request_duration_seconds{${labels},quantile="0.95"} ${(endpointMetrics.latency.p95 / 1000).toFixed(6)}`
        );
        lines.push(
            `http_request_duration_seconds{${labels},quantile="0.99"} ${(endpointMetrics.latency.p99 / 1000).toFixed(6)}`
        );

        // Status code distribution
        for (const [code, count] of Object.entries(
            endpointMetrics.statusCodes
        )) {
            lines.push(
                `http_requests_total{${labels},status="${code}"} ${count}`
            );
        }
    }

    // Global metrics
    lines.push(`http_requests_total ${metrics.totalRequests}`);
    lines.push(`http_errors_total ${metrics.totalErrors}`);
    lines.push(
        `http_request_duration_seconds{quantile="0.5"} ${(metrics.globalLatency.p50 / 1000).toFixed(6)}`
    );
    lines.push(
        `http_request_duration_seconds{quantile="0.95"} ${(metrics.globalLatency.p95 / 1000).toFixed(6)}`
    );
    lines.push(
        `http_request_duration_seconds{quantile="0.99"} ${(metrics.globalLatency.p99 / 1000).toFixed(6)}`
    );

    return lines.join("\n");
}

/**
 * Export metrics as JSON for custom monitoring
 */
export function exportJsonMetrics(): string {
    return JSON.stringify(getApiMetrics(), null, 2);
}
