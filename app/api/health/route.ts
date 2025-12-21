/**
 * Health Check API Route
 * Ref: System health monitoring endpoint
 *
 * @module app/api/health/route
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getRedis, isRedisAvailable } from "@/lib/cache";

export const maxDuration = 10;

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type HealthCheckResult = {
    status: HealthStatus;
    latency?: number;
    error?: string;
};

type HealthResponse = {
    status: HealthStatus;
    timestamp: string;
    checks: {
        database: HealthCheckResult;
        environment: HealthCheckResult;
        cache: HealthCheckResult;
    };
};

/**
 * Check PostgreSQL database connectivity
 */
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
    if (!process.env.DATABASE_URL) {
        return { status: "unhealthy", error: "DATABASE_URL not configured" };
    }

    try {
        const startTime = Date.now();
        const db = getDb();
        await db.execute(sql`SELECT 1`);
        const latency = Date.now() - startTime;

        // Warn if latency is high (> 1000ms)
        if (latency > 1000) {
            return {
                status: "degraded",
                latency,
                error: "High database latency",
            };
        }

        return { status: "healthy", latency };
    } catch (error) {
        return {
            status: "unhealthy",
            error:
                error instanceof Error
                    ? error.message
                    : "Database query failed",
        };
    }
}

/**
 * Check cache health with actual Redis ping
 */
async function checkCacheHealth(): Promise<HealthCheckResult> {
    // Check if Redis is configured
    if (!isRedisAvailable()) {
        return {
            status: "degraded",
            latency: 0,
            error: "Redis not configured",
        };
    }

    try {
        const redis = getRedis();
        if (!redis) {
            return {
                status: "degraded",
                latency: 0,
                error: "Redis client unavailable",
            };
        }

        const startTime = Date.now();
        const pong = await redis.ping();
        const latency = Date.now() - startTime;

        if (pong !== "PONG") {
            return {
                status: "unhealthy",
                latency,
                error: "Unexpected PING response",
            };
        }

        // Warn if latency > 500ms
        if (latency > 500) {
            return {
                status: "degraded",
                latency,
                error: "High cache latency",
            };
        }

        return { status: "healthy", latency };
    } catch (error) {
        return {
            status: "degraded",
            latency: 0,
            error: error instanceof Error ? error.message : "Cache check failed",
        };
    }
}

/**
 * Check critical environment variables are set
 */
function checkEnvironmentHealth(): HealthCheckResult {
    const requiredVars = ["DATABASE_URL"];
    const missingVars = requiredVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
        return {
            status: "unhealthy",
            error: `Missing env vars: ${missingVars.join(", ")}`,
        };
    }

    return { status: "healthy" };
}

/**
 * Determine overall health status from individual checks
 */
function determineOverallStatus(
    checks: HealthResponse["checks"]
): HealthStatus {
    const statuses = Object.values(checks).map((c) => c.status);

    if (statuses.includes("unhealthy")) {
        return "unhealthy";
    }
    if (statuses.includes("degraded")) {
        return "degraded";
    }
    return "healthy";
}

/**
 * GET /api/health - Health check endpoint
 *
 * Status codes:
 * - 200: System healthy or degraded (still operational)
 * - 503: System unhealthy (critical failure)
 */
export async function GET(): Promise<Response> {
    try {
        const [dbHealth, envHealth, cacheHealth] = await Promise.all([
            checkDatabaseHealth(),
            Promise.resolve(checkEnvironmentHealth()),
            checkCacheHealth(),
        ]);

        const checks = {
            database: dbHealth,
            environment: envHealth,
            cache: cacheHealth,
        };

        const overallStatus = determineOverallStatus(checks);

        const health: HealthResponse = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks,
        };

        const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

        return Response.json(health, {
            status: httpStatus,
            headers: { "Cache-Control": "public, max-age=0" },
        });
    } catch (error) {
        console.error("[Health Check] Failed:", error);

        const errorResponse: HealthResponse = {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            checks: {
                database: { status: "unhealthy", error: "Check failed" },
                environment: { status: "unhealthy", error: "Check failed" },
                cache: { status: "unhealthy", error: "Check failed" },
            },
        };

        return Response.json(errorResponse, {
            status: 503,
            headers: { "Cache-Control": "public, max-age=0" },
        });
    }
}
