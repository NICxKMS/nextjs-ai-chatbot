import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/monitoring/dashboard";
import { logger } from "@/lib/monitoring/logger";

/**
 * Health check endpoint for monitoring and uptime checks
 * Returns system status including cache, database, and connection pool health
 *
 * Status codes:
 * - 200: System healthy
 * - 503: System degraded or critical
 *
 * Automatically sends metrics to New Relic when configured
 */
export async function GET() {
	const startTime = Date.now();

	try {
		const health = await getSystemHealth();
		const duration = Date.now() - startTime;

		logger.perf("HealthCheck", duration, {
			status: health.status,
			cache: health.components?.cache?.status,
			pool: health.components?.connectionPool?.status,
		});

		// Return 503 if system is unhealthy (for load balancer health checks)
		const statusCode = health.status === "healthy" ? 200 : 503;

		if (statusCode === 503) {
			logger.warn("System unhealthy", {
				status: health.status,
				cache: health.components?.cache?.status,
				pool: health.components?.connectionPool?.status,
			});
		}

		return NextResponse.json(health, { status: statusCode });
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error("Health check failed", {
			error,
			duration,
		});

		// Return 503 on unexpected errors
		return NextResponse.json(
			{
				healthy: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 503 }
		);
	}
}
