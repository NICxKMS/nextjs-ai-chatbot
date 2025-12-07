import "server-only";

import { trace } from "@opentelemetry/api";

/**
 * ==============================================================================
 * CACHE METRICS TRACKING
 * ==============================================================================
 *
 * Provides visibility into cache performance with OpenTelemetry integration.
 * Tracks hit rates, miss rates, and operation latencies.
 *
 * Features:
 * - Real-time hit/miss tracking
 * - Per-operation metrics
 * - OpenTelemetry span attributes
 * - Periodic metrics reporting
 */

type OperationMetrics = {
	hits: number;
	misses: number;
	errors: number;
	totalLatencyMs: number;
	operationCount: number;
};

class CacheMetricsCollector {
	private readonly metrics: Map<string, OperationMetrics> = new Map();

	/**
	 * Record a cache hit
	 */
	recordHit(operation: string, latencyMs = 0): void {
		const metrics = this.getOrCreateMetrics(operation);
		metrics.hits++;
		metrics.totalLatencyMs += latencyMs;
		metrics.operationCount++;

		// Add to OpenTelemetry span
		const span = trace.getActiveSpan();
		if (span) {
			span.setAttribute("cache.hit", true);
			span.setAttribute("cache.operation", operation);
			if (latencyMs > 0) {
				span.setAttribute("cache.latency_ms", latencyMs);
			}
		}
	}

	/**
	 * Record a cache miss
	 */
	recordMiss(operation: string, latencyMs = 0): void {
		const metrics = this.getOrCreateMetrics(operation);
		metrics.misses++;
		metrics.totalLatencyMs += latencyMs;
		metrics.operationCount++;

		// Add to OpenTelemetry span
		const span = trace.getActiveSpan();
		if (span) {
			span.setAttribute("cache.hit", false);
			span.setAttribute("cache.operation", operation);
			if (latencyMs > 0) {
				span.setAttribute("cache.latency_ms", latencyMs);
			}
		}
	}

	/**
	 * Record a cache error
	 */
	recordError(operation: string, error: unknown): void {
		const metrics = this.getOrCreateMetrics(operation);
		metrics.errors++;

		// Add to OpenTelemetry span
		const span = trace.getActiveSpan();
		if (span) {
			span.setAttribute("cache.error", true);
			span.setAttribute("cache.operation", operation);
			span.recordException(error as Error);
		}
	}

	/**
	 * Get metrics for a specific operation
	 */
	getMetrics(operation: string): OperationMetrics | undefined {
		return this.metrics.get(operation);
	}

	/**
	 * Get hit rate for a specific operation (0.0 to 1.0)
	 */
	getHitRate(operation: string): number {
		const metrics = this.metrics.get(operation);
		if (!metrics) {
			return 0;
		}

		const total = metrics.hits + metrics.misses;
		return total > 0 ? metrics.hits / total : 0;
	}

	/**
	 * Get average latency for a specific operation
	 */
	getAverageLatency(operation: string): number {
		const metrics = this.metrics.get(operation);
		if (!metrics || metrics.operationCount === 0) {
			return 0;
		}

		return metrics.totalLatencyMs / metrics.operationCount;
	}

	/**
	 * Get overall cache hit rate across all operations
	 */
	getOverallHitRate(): number {
		let totalHits = 0;
		let totalMisses = 0;

		for (const metrics of this.metrics.values()) {
			totalHits += metrics.hits;
			totalMisses += metrics.misses;
		}

		const total = totalHits + totalMisses;
		return total > 0 ? totalHits / total : 0;
	}

	/**
	 * Get all metrics summary
	 */
	getSummary(): Record<
		string,
		{
			hits: number;
			misses: number;
			errors: number;
			hitRate: number;
			avgLatencyMs: number;
		}
	> {
		const summary: Record<string, unknown> = {};

		for (const [operation, metrics] of this.metrics.entries()) {
			const total = metrics.hits + metrics.misses;
			summary[operation] = {
				hits: metrics.hits,
				misses: metrics.misses,
				errors: metrics.errors,
				hitRate: total > 0 ? metrics.hits / total : 0,
				avgLatencyMs:
					metrics.operationCount > 0
						? metrics.totalLatencyMs / metrics.operationCount
						: 0,
			};
		}

		return summary as Record<
			string,
			{
				hits: number;
				misses: number;
				errors: number;
				hitRate: number;
				avgLatencyMs: number;
			}
		>;
	}

	/**
	 * Reset all metrics
	 */
	reset(): void {
		this.metrics.clear();
	}

	/**
	 * Get or create metrics for an operation
	 */
	private getOrCreateMetrics(operation: string): OperationMetrics {
		let metrics = this.metrics.get(operation);
		if (!metrics) {
			metrics = {
				hits: 0,
				misses: 0,
				errors: 0,
				totalLatencyMs: 0,
				operationCount: 0,
			};
			this.metrics.set(operation, metrics);
		}
		return metrics;
	}
}

// Singleton instance
const metricsCollector = new CacheMetricsCollector();

// Export convenience functions
export const CacheMetrics = {
	recordHit: (operation: string, latencyMs?: number) =>
		metricsCollector.recordHit(operation, latencyMs),
	recordMiss: (operation: string, latencyMs?: number) =>
		metricsCollector.recordMiss(operation, latencyMs),
	recordError: (operation: string, error: unknown) =>
		metricsCollector.recordError(operation, error),
	getMetrics: (operation: string) => metricsCollector.getMetrics(operation),
	getHitRate: (operation: string) => metricsCollector.getHitRate(operation),
	getAverageLatency: (operation: string) =>
		metricsCollector.getAverageLatency(operation),
	getOverallHitRate: () => metricsCollector.getOverallHitRate(),
	getSummary: () => metricsCollector.getSummary(),
	reset: () => metricsCollector.reset(),
};

/**
 * Helper to wrap cache operations with metrics tracking
 */
export async function withCacheMetrics<T>(
	operation: string,
	fn: () => Promise<T | null | undefined>
): Promise<T | null | undefined> {
	const start = performance.now();

	try {
		const result = await fn();
		const latency = performance.now() - start;

		if (result !== null && result !== undefined) {
			CacheMetrics.recordHit(operation, latency);
		} else {
			CacheMetrics.recordMiss(operation, latency);
		}

		return result;
	} catch (error) {
		CacheMetrics.recordError(operation, error);
		throw error;
	}
}
