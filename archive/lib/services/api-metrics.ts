/**
 * API Metrics Collection
 *
 * Collects API performance metrics for monitoring and optimization.
 * In-memory implementation suitable for edge functions.
 *
 * @module lib/services/api-metrics
 * @see OPT-030
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RequestMetric {
    /** Request timestamp */
    timestamp: number;
    /** Request duration in milliseconds */
    duration: number;
    /** HTTP status code */
    status: number;
    /** Response size in bytes (if available) */
    size?: number;
}

export interface ErrorMetric {
    /** Error timestamp */
    timestamp: number;
    /** Error code or name */
    code: string;
    /** Error message */
    message: string;
    /** Stack trace (truncated) */
    stack?: string;
}

export interface EndpointMetrics {
    /** Total number of requests */
    totalRequests: number;
    /** Number of successful requests (2xx) */
    successfulRequests: number;
    /** Number of client errors (4xx) */
    clientErrors: number;
    /** Number of server errors (5xx) */
    serverErrors: number;
    /** Average response time in ms */
    avgDuration: number;
    /** Minimum response time in ms */
    minDuration: number;
    /** Maximum response time in ms */
    maxDuration: number;
    /** 50th percentile (median) response time */
    p50Duration: number;
    /** 95th percentile response time */
    p95Duration: number;
    /** 99th percentile response time */
    p99Duration: number;
    /** Error rate (0-1) */
    errorRate: number;
    /** Recent errors */
    recentErrors: ErrorMetric[];
}

export interface MetricsSummary {
    /** Metrics collected since */
    since: number;
    /** Total requests across all endpoints */
    totalRequests: number;
    /** Total errors across all endpoints */
    totalErrors: number;
    /** Overall error rate */
    overallErrorRate: number;
    /** Average response time across all endpoints */
    avgResponseTime: number;
    /** Per-endpoint metrics */
    endpoints: Record<string, EndpointMetrics>;
    /** Top 5 slowest endpoints */
    slowestEndpoints: Array<{ endpoint: string; avgDuration: number }>;
    /** Top 5 error-prone endpoints */
    errorProneEndpoints: Array<{ endpoint: string; errorRate: number }>;
}

export interface ApiMetricsConfig {
    /** Maximum requests to store per endpoint (default: 1000) */
    maxRequestsPerEndpoint?: number;
    /** Maximum errors to store per endpoint (default: 100) */
    maxErrorsPerEndpoint?: number;
    /** Maximum number of endpoints to track (default: 100) */
    maxEndpoints?: number;
    /** Retention period in milliseconds (default: 3600000 = 1 hour) */
    retentionMs?: number;
}

// =============================================================================
// API METRICS CLASS
// =============================================================================

/**
 * API metrics collector for performance monitoring.
 *
 * @example
 * ```ts
 * import { apiMetrics } from "@/lib/services/api-metrics";
 *
 * // Record a request
 * const start = Date.now();
 * const response = await handler(request);
 * apiMetrics.recordRequest("/api/chat", Date.now() - start, response.status);
 *
 * // Record an error
 * apiMetrics.recordError("/api/chat", error);
 *
 * // Get metrics summary
 * const summary = apiMetrics.getMetrics();
 * console.log(`Error rate: ${summary.overallErrorRate * 100}%`);
 * ```
 */
class ApiMetricsCollector {
    private readonly requests = new Map<string, RequestMetric[]>();
    private readonly errors = new Map<string, ErrorMetric[]>();
    private startTime = Date.now();
    private readonly config: Required<ApiMetricsConfig>;

    constructor(config: ApiMetricsConfig = {}) {
        this.config = {
            maxRequestsPerEndpoint: config.maxRequestsPerEndpoint ?? 1000,
            maxErrorsPerEndpoint: config.maxErrorsPerEndpoint ?? 100,
            maxEndpoints: config.maxEndpoints ?? 100,
            retentionMs: config.retentionMs ?? 3_600_000, // 1 hour
        };
    }

    /**
     * Record a completed API request.
     */
    recordRequest(
        endpoint: string,
        duration: number,
        status: number,
        size?: number
    ): void {
        // Normalize endpoint
        const normalizedEndpoint = this.normalizeEndpoint(endpoint);

        // Get or create endpoint metrics
        let endpointRequests = this.requests.get(normalizedEndpoint);
        if (!endpointRequests) {
            // Check max endpoints
            if (this.requests.size >= this.config.maxEndpoints) {
                this.evictOldestEndpoint();
            }
            endpointRequests = [];
            this.requests.set(normalizedEndpoint, endpointRequests);
        }

        // Add metric
        endpointRequests.push({
            timestamp: Date.now(),
            duration,
            status,
            size,
        });

        // Trim if over limit
        if (endpointRequests.length > this.config.maxRequestsPerEndpoint) {
            endpointRequests.shift();
        }
    }

    /**
     * Record an API error.
     */
    recordError(endpoint: string, error: Error): void {
        const normalizedEndpoint = this.normalizeEndpoint(endpoint);

        let endpointErrors = this.errors.get(normalizedEndpoint);
        if (!endpointErrors) {
            endpointErrors = [];
            this.errors.set(normalizedEndpoint, endpointErrors);
        }

        endpointErrors.push({
            timestamp: Date.now(),
            code: (error as { code?: string }).code ?? error.name,
            message: error.message,
            stack: error.stack?.slice(0, 500), // Truncate stack
        });

        // Trim if over limit
        if (endpointErrors.length > this.config.maxErrorsPerEndpoint) {
            endpointErrors.shift();
        }
    }

    /**
     * Get comprehensive metrics summary.
     */
    getMetrics(): MetricsSummary {
        this.pruneOldData();

        const endpoints: Record<string, EndpointMetrics> = {};
        let totalRequests = 0;
        let totalErrors = 0;
        let totalDuration = 0;

        for (const [endpoint, requests] of this.requests.entries()) {
            const metrics = this.calculateEndpointMetrics(endpoint, requests);
            endpoints[endpoint] = metrics;
            totalRequests += metrics.totalRequests;
            totalErrors += metrics.serverErrors + metrics.clientErrors;
            totalDuration += metrics.avgDuration * metrics.totalRequests;
        }

        // Calculate slowest endpoints
        const slowestEndpoints = Object.entries(endpoints)
            .map(([endpoint, m]) => ({ endpoint, avgDuration: m.avgDuration }))
            .sort((a, b) => b.avgDuration - a.avgDuration)
            .slice(0, 5);

        // Calculate error-prone endpoints
        const errorProneEndpoints = Object.entries(endpoints)
            .filter(([, m]) => m.totalRequests >= 10) // Minimum sample size
            .map(([endpoint, m]) => ({ endpoint, errorRate: m.errorRate }))
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 5);

        return {
            since: this.startTime,
            totalRequests,
            totalErrors,
            overallErrorRate:
                totalRequests > 0 ? totalErrors / totalRequests : 0,
            avgResponseTime:
                totalRequests > 0 ? totalDuration / totalRequests : 0,
            endpoints,
            slowestEndpoints,
            errorProneEndpoints,
        };
    }

    /**
     * Get metrics for a specific endpoint.
     */
    getEndpointMetrics(endpoint: string): EndpointMetrics | null {
        const normalizedEndpoint = this.normalizeEndpoint(endpoint);
        const requests = this.requests.get(normalizedEndpoint);

        if (!requests || requests.length === 0) {
            return null;
        }

        return this.calculateEndpointMetrics(normalizedEndpoint, requests);
    }

    /**
     * Reset all metrics.
     */
    reset(): void {
        this.requests.clear();
        this.errors.clear();
        this.startTime = Date.now();
    }

    /**
     * Get raw request count for an endpoint.
     */
    getRequestCount(endpoint: string): number {
        const normalizedEndpoint = this.normalizeEndpoint(endpoint);
        return this.requests.get(normalizedEndpoint)?.length ?? 0;
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private normalizeEndpoint(endpoint: string): string {
        // Remove query params and normalize path
        const url = endpoint.startsWith("/")
            ? endpoint
            : new URL(endpoint).pathname;

        // Replace common dynamic segments with placeholders
        return url
            .replace(
                /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
                "/:uuid"
            )
            .replace(/\/\d+(?=\/|$)/g, "/:id")
            .replace(/\?.*$/, "");
    }

    private calculateEndpointMetrics(
        endpoint: string,
        requests: RequestMetric[]
    ): EndpointMetrics {
        const errors = this.errors.get(endpoint) ?? [];
        const durations = requests.map((r) => r.duration).sort((a, b) => a - b);

        const successfulRequests = requests.filter(
            (r) => r.status >= 200 && r.status < 300
        ).length;
        const clientErrors = requests.filter(
            (r) => r.status >= 400 && r.status < 500
        ).length;
        const serverErrors = requests.filter((r) => r.status >= 500).length;

        const totalDuration = durations.reduce((sum, d) => sum + d, 0);

        return {
            totalRequests: requests.length,
            successfulRequests,
            clientErrors,
            serverErrors,
            avgDuration:
                requests.length > 0 ? totalDuration / requests.length : 0,
            minDuration: durations[0] ?? 0,
            maxDuration: durations.at(-1) ?? 0,
            p50Duration: this.percentile(durations, 50),
            p95Duration: this.percentile(durations, 95),
            p99Duration: this.percentile(durations, 99),
            errorRate:
                requests.length > 0
                    ? (clientErrors + serverErrors) / requests.length
                    : 0,
            recentErrors: errors.slice(-10), // Last 10 errors
        };
    }

    private percentile(sorted: number[], p: number): number {
        if (sorted.length === 0) {
            return 0;
        }
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)] ?? 0;
    }

    private pruneOldData(): void {
        const cutoff = Date.now() - this.config.retentionMs;

        for (const [endpoint, requests] of this.requests.entries()) {
            const filtered = requests.filter((r) => r.timestamp >= cutoff);
            if (filtered.length === 0) {
                this.requests.delete(endpoint);
                this.errors.delete(endpoint);
            } else {
                this.requests.set(endpoint, filtered);
            }
        }

        for (const [endpoint, errors] of this.errors.entries()) {
            const filtered = errors.filter((e) => e.timestamp >= cutoff);
            if (filtered.length === 0) {
                this.errors.delete(endpoint);
            } else {
                this.errors.set(endpoint, filtered);
            }
        }
    }

    private evictOldestEndpoint(): void {
        let oldestEndpoint: string | null = null;
        let oldestTime = Date.now();

        for (const [endpoint, requests] of this.requests.entries()) {
            const firstRequest = requests[0];
            if (firstRequest && firstRequest.timestamp < oldestTime) {
                oldestTime = firstRequest.timestamp;
                oldestEndpoint = endpoint;
            }
        }

        if (oldestEndpoint) {
            this.requests.delete(oldestEndpoint);
            this.errors.delete(oldestEndpoint);
        }
    }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default API metrics collector instance.
 */
export const apiMetrics = new ApiMetricsCollector();

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Create a metrics-collecting middleware wrapper.
 *
 * @example
 * ```ts
 * const handler = withMetrics(async (request) => {
 *   // Your handler logic
 *   return new Response("OK");
 * });
 * ```
 */
export function withMetrics<
    T extends (request: Request, ...args: unknown[]) => Promise<Response>,
>(handler: T, endpoint?: string): T {
    return (async (request: Request, ...args: unknown[]) => {
        const start = Date.now();
        const url = endpoint ?? new URL(request.url).pathname;

        try {
            const response = await handler(request, ...args);
            const duration = Date.now() - start;

            apiMetrics.recordRequest(
                url,
                duration,
                response.status,
                Number(response.headers.get("content-length")) || undefined
            );

            return response;
        } catch (error) {
            const duration = Date.now() - start;
            apiMetrics.recordRequest(url, duration, 500);
            apiMetrics.recordError(
                url,
                error instanceof Error ? error : new Error(String(error))
            );
            throw error;
        }
    }) as T;
}

// =============================================================================
// EXPORT CLASS FOR TESTING
// =============================================================================

export { ApiMetricsCollector };
