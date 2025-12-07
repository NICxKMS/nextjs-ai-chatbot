import "server-only";

import { getRedisClient } from "@/lib/cache/redis";
import { type PoolStats, poolMonitor } from "@/lib/db/pool-monitor";

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
 * 3. Set env var: NEW_RELIC_APP_NAME=nextjs-chatbot
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
 * Get New Relic agent (lazy loaded, optional dependency)
 */
function getNewRelicAgent() {
	try {
		const newrelic = require("newrelic");
		return newrelic;
	} catch {
		// New Relic not installed or not configured
		return null;
	}
}

/**
 * Record custom event to New Relic
 */
function recordNewRelicEvent(
	eventType: string,
	attributes: Record<string, string | number | boolean>
) {
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		newrelic.recordCustomEvent(eventType, attributes);
	} catch (error) {
		console.error("Failed to record New Relic event:", error);
	}
}

/**
 * Record custom metric to New Relic
 */
function recordNewRelicMetric(name: string, value: number) {
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		newrelic.recordMetric(name, value);
	} catch (error) {
		console.error("Failed to record New Relic metric:", error);
	}
}

/**
 * Add custom attributes to current transaction
 */
function addNewRelicAttributes(
	attributes: Record<string, string | number | boolean>
) {
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		for (const [key, value] of Object.entries(attributes)) {
			newrelic.addCustomAttribute(key, value);
		}
	} catch (error) {
		console.error("Failed to add New Relic attributes:", error);
	}
}

/**
 * Notice error in New Relic
 */
export function noticeNewRelicError(
	error: Error,
	customAttributes?: Record<string, unknown>
) {
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		newrelic.noticeError(error, customAttributes);
	} catch (err) {
		console.error("Failed to notice New Relic error:", err);
	}
}

/**
 * Check cache (Redis) health
 */
async function checkCacheHealth(): Promise<ComponentHealth> {
	const redis = getRedisClient();

	if (!redis) {
		recordNewRelicEvent("CacheHealthCheck", {
			status: "degraded",
			reason: "not_configured",
		});

		return {
			status: "degraded",
			message: "Redis not configured",
			details: {},
		};
	}

	try {
		const start = Date.now();
		await redis.ping();
		const duration = Date.now() - start;

		recordNewRelicMetric("Custom/Cache/ResponseTime", duration);

		if (duration > 500) {
			recordNewRelicEvent("CacheHealthCheck", {
				status: "degraded",
				reason: "slow_response",
				responseTime: duration,
			});

			return {
				status: "degraded",
				message: "Cache responding slowly",
				details: { responseTime: duration },
			};
		}

		recordNewRelicEvent("CacheHealthCheck", {
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

		recordNewRelicEvent("CacheHealthCheck", {
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
	recordNewRelicMetric("Custom/ConnectionPool/Active", stats.active);
	recordNewRelicMetric("Custom/ConnectionPool/Idle", stats.idle);
	recordNewRelicMetric("Custom/ConnectionPool/Waiting", stats.waiting);
	recordNewRelicMetric("Custom/ConnectionPool/Total", stats.total);

	const usageRate = stats.max > 0 ? stats.active / stats.max : 0;
	recordNewRelicMetric("Custom/ConnectionPool/UsageRate", usageRate);

	// Check for high wait times
	if (stats.waiting > 10) {
		recordNewRelicEvent("ConnectionPoolHealthCheck", {
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
		recordNewRelicEvent("ConnectionPoolHealthCheck", {
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

	recordNewRelicEvent("ConnectionPoolHealthCheck", {
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
	recordNewRelicMetric("Custom/Database/QueriesTotal", totalQueries);
	recordNewRelicMetric(
		"Custom/Database/TransactionsTotal",
		totalTransactions
	);
	recordNewRelicMetric("Custom/Database/ErrorRate", errorRate);
	recordNewRelicMetric(
		"Custom/Database/Timeouts",
		connectionMetrics.timeouts
	);

	return {
		totalQueries,
		totalTransactions,
		averageQueryDuration: 50, // Placeholder - would come from query tracking
		slowQueries: 0,
		errorRate,
	};
}

/**
 * Get cache metrics from Redis
 */
async function getCacheMetrics(): Promise<AggregatedMetrics["cache"]> {
	const redis = getRedisClient();

	if (!redis) {
		return {
			hitRate: 0,
			missRate: 0,
			totalRequests: 0,
			averageLatency: 0,
		};
	}

	try {
		// Get cache stats from Redis
		const cacheStats = await redis.get<{
			hits?: number;
			misses?: number;
		}>("metrics:cache");

		const hits = cacheStats?.hits || 0;
		const misses = cacheStats?.misses || 0;
		const total = hits + misses;
		const hitRate = total > 0 ? hits / total : 0;
		const missRate = total > 0 ? misses / total : 0;

		// Record to New Relic
		recordNewRelicMetric("Custom/Cache/HitRate", hitRate);
		recordNewRelicMetric("Custom/Cache/MissRate", missRate);
		recordNewRelicMetric("Custom/Cache/Hits", hits);
		recordNewRelicMetric("Custom/Cache/Misses", misses);
		recordNewRelicMetric("Custom/Cache/TotalRequests", total);

		return {
			hitRate,
			missRate,
			totalRequests: total,
			averageLatency: 10, // Placeholder
		};
	} catch (error) {
		noticeNewRelicError(
			error instanceof Error ? error : new Error(String(error)),
			{
				component: "cache",
				operation: "get_metrics",
			}
		);

		return {
			hitRate: 0,
			missRate: 0,
			totalRequests: 0,
			averageLatency: 0,
		};
	}
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
		recordNewRelicMetric("Custom/RateLimit/TotalRequests", total);
		recordNewRelicMetric("Custom/RateLimit/BlockedRequests", blocked);
		recordNewRelicMetric("Custom/RateLimit/BlockRate", blockRate);

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
		recordNewRelicMetric(
			"Custom/Deduplication/DuplicatesDetected",
			duplicates
		);
		recordNewRelicMetric("Custom/Deduplication/CacheHits", cacheHits);
		recordNewRelicMetric(
			"Custom/Deduplication/SavingsPercent",
			savingsPercent
		);

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
		recordNewRelicEvent("SystemHealthCheck", {
			status,
			uptime,
			cacheStatus: cache.status,
			poolStatus: connectionPool.status,
			cacheHitRate: metrics.cache.hitRate,
			poolActive: metrics.connectionPool.active,
			poolWaiting: metrics.connectionPool.waiting,
		});

		// Add attributes to current transaction
		addNewRelicAttributes({
			"health.status": status,
			"health.cacheStatus": cache.status,
			"health.poolStatus": connectionPool.status,
			"health.cacheHitRate": metrics.cache.hitRate,
		});

		const duration = Date.now() - healthCheckStart;
		recordNewRelicMetric("Custom/HealthCheck/Duration", duration);

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
		recordNewRelicEvent("SystemHealthAlert", {
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
	recordNewRelicMetric(metricName, value);
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
	recordNewRelicEvent(eventType, attributes);
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
		recordNewRelicMetric(`Custom/Segment/${segmentName}`, duration);
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

			recordNewRelicMetric(`Custom/Transaction/${name}`, duration);
			recordNewRelicEvent("TransactionComplete", {
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

			recordNewRelicEvent("TransactionComplete", {
				name,
				duration,
				success: false,
				error: String(error),
			});

			throw error;
		}
	};
}
