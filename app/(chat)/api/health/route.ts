import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/monitoring/dashboard";
import { logger } from "@/lib/monitoring/logger";
import { getAgentStatus } from "@/lib/monitoring/newrelic-agent";
import { withPerformanceTracking } from "@/lib/monitoring/performance";

/**
 * Health check endpoint for monitoring and uptime checks
 * Returns system status including cache, database, and connection pool health
 *
 * Status codes:
 * - 200: System healthy
 * - 503: System degraded or critical
 *
 * IMPORTANT: This endpoint sends SystemHealthCheck events to New Relic.
 * Configure external monitoring (New Relic Synthetics, UptimeRobot, etc.)
 * to call this endpoint every 1-5 minutes to ensure health metrics are reported.
 *
 * Example monitoring setup:
 * - New Relic Synthetics: Create a ping monitor targeting /api/health
 * - Vercel Cron: Add cron job in vercel.json with "every 5 minutes" schedule
 * - External: Use any uptime monitoring service (UptimeRobot, Pingdom, etc.)
 */
export const GET = withPerformanceTracking(
    "GET /api/health",
    async (request: Request) => {
        const startTime = Date.now();
        const url = new URL(request.url);
        const includeNewRelic = url.searchParams.get("newrelic") === "true";

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

            // Include New Relic diagnostic info if requested
            const response = includeNewRelic
                ? { ...health, newrelic: getAgentStatus() }
                : health;

            return NextResponse.json(response, { status: statusCode });
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error("Health check failed", error, {
                duration,
            });

            // Return 503 on unexpected errors
            return NextResponse.json(
                {
                    healthy: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                },
                { status: 503 }
            );
        }
    },
    {
        extractMetadata: (request) => {
            const url = new URL(request.url);
            return {
                includeNewRelic: url.searchParams.get("newrelic") === "true",
            };
        },
    }
);
