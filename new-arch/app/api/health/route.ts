/**
 * Health Check Route
 * @module new-arch/app/api/health/route
 *
 * Health check endpoint for monitoring and load balancers.
 */

import { createRouteHandler, json } from "@/lib/api";
import { getRedisClient } from "@/lib/cache/client";
import { sql } from "@/lib/data/db";

type HealthResponse = {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    version: string;
    checks: {
        database: "ok" | "error";
        cache: "ok" | "error";
    };
};

/**
 * GET /api/health
 *
 * Returns service health status for monitoring.
 * No authentication required.
 */
export const GET = createRouteHandler(
    {
        surface: "health",
        method: "GET",
        auth: "none",
        cachePolicy: "no-store",
    },
    async () => {
        // Perform health checks
        const dbStatus = await checkDatabase();
        const cacheStatus = await checkCache();

        const allHealthy = dbStatus === "ok" && cacheStatus === "ok";
        const anyError = dbStatus === "error" || cacheStatus === "error";

        const healthResponse: HealthResponse = {
            status: anyError
                ? "unhealthy"
                : allHealthy
                  ? "healthy"
                  : "degraded",
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version ?? "0.0.0",
            checks: {
                database: dbStatus,
                cache: cacheStatus,
            },
        };

        // Return 503 if unhealthy
        const status = healthResponse.status === "unhealthy" ? 503 : 200;

        return json(healthResponse, { status });
    }
);

// ============================================================================
// Health Check Implementations (Stubs)
// ============================================================================

async function checkDatabase(): Promise<"ok" | "error"> {
    try {
        // Execute a simple query to verify database connectivity
        await sql`SELECT 1`;
        return "ok";
    } catch (error) {
        console.error("[health] Database check failed:", error);
        return "error";
    }
}

async function checkCache(): Promise<"ok" | "error"> {
    try {
        const redis = getRedisClient();
        if (!redis) {
            // Redis not configured - treat as degraded, not error
            // This allows the app to function without cache
            return "ok";
        }
        // Ping Redis to verify connectivity
        const result = await redis.ping();
        return result === "PONG" ? "ok" : "error";
    } catch (error) {
        console.error("[health] Cache check failed:", error);
        return "error";
    }
}
