import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRedisClient, isRedisAvailable } from "@/lib/cache/redis";
import { db } from "@/lib/db/queries";
import { logError } from "@/lib/log";

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
        cache: HealthCheckResult;
        environment: HealthCheckResult;
    };
};

/**
 * Issue #19 Fix: Implement actual health checks
 * Check PostgreSQL database connectivity
 */
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
    if (!process.env.DATABASE_URL) {
        return { status: "unhealthy", error: "DATABASE_URL not configured" };
    }

    try {
        const startTime = Date.now();
        // Execute a simple query to verify database connectivity
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
 * Issue #19 Fix: Implement actual health checks
 * Check Redis cache connectivity
 */
async function checkCacheHealth(): Promise<HealthCheckResult> {
    if (!isRedisAvailable()) {
        return { status: "degraded", error: "Redis not configured" };
    }

    try {
        const startTime = Date.now();
        const redis = getRedisClient();
        if (!redis) {
            return { status: "degraded", error: "Redis client unavailable" };
        }
        await redis.ping();
        const latency = Date.now() - startTime;

        return { status: "healthy", latency };
    } catch (error) {
        return {
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Redis ping failed",
        };
    }
}

/**
 * Check critical environment variables are set
 */
function checkEnvironmentHealth(): HealthCheckResult {
    const requiredVars = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
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
 * Health check endpoint for monitoring and uptime checks
 * Returns system status including cache and environment health
 *
 * Status codes:
 * - 200: System healthy or degraded (still operational)
 * - 503: System unhealthy (critical failure)
 */
export async function GET() {
    try {
        // Issue #19 Fix: Run actual health checks including database
        const [dbHealth, cacheHealth, envHealth] = await Promise.all([
            checkDatabaseHealth(),
            checkCacheHealth(),
            Promise.resolve(checkEnvironmentHealth()),
        ]);

        const checks = {
            database: dbHealth,
            cache: cacheHealth,
            environment: envHealth,
        };

        const overallStatus = determineOverallStatus(checks);

        // Issue #20 Fix: Consistent response schema
        const health: HealthResponse = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks,
        };

        // Return 503 only for unhealthy status
        const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

        return NextResponse.json(health, {
            status: httpStatus,
            headers: {
                "Cache-Control": "public, max-age=0",
            },
        });
    } catch (error) {
        logError("Health check failed", error);

        // Issue #20 Fix: Consistent response schema for errors
        const errorResponse: HealthResponse = {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            checks: {
                database: { status: "unhealthy", error: "Check failed" },
                cache: { status: "unhealthy", error: "Check failed" },
                environment: { status: "unhealthy", error: "Check failed" },
            },
        };

        return NextResponse.json(errorResponse, {
            status: 503,
            headers: {
                "Cache-Control": "public, max-age=0",
            },
        });
    }
}
