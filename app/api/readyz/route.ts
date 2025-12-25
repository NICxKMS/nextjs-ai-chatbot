/**
 * Kubernetes Readiness Probe
 * "Is the app ready to receive traffic?" check
 *
 * @module app/api/readyz/route
 *
 * Used by K8s readiness probe to determine if the pod should receive traffic.
 * This endpoint checks:
 * - Database connectivity
 * - Required services availability
 * Returns 200 only when fully ready to serve requests.
 */

import { sql } from "drizzle-orm";
import { getRedis, isRedisAvailable } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

// =============================================================================
// READINESS CHECK CONSTANTS
// =============================================================================

/** Timeout for individual health checks in milliseconds */
const CHECK_TIMEOUT_MS = 5000;

/** Maximum acceptable database latency before marking as unhealthy */
const DB_LATENCY_THRESHOLD_MS = 3000;

/** Maximum acceptable cache latency before marking as unhealthy */
const CACHE_LATENCY_THRESHOLD_MS = 1000;

// =============================================================================
// TYPES
// =============================================================================

type CheckStatus = "healthy" | "unhealthy";

interface HealthCheck {
    name: string;
    status: CheckStatus;
    latencyMs?: number;
    error?: string;
}

interface ReadinessResponse {
    status: "ready" | "not_ready";
    timestamp: string;
    checks: HealthCheck[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

/**
 * Check PostgreSQL database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
    const name = "database";

    if (!process.env.DATABASE_URL) {
        return {
            name,
            status: "unhealthy",
            error: "DATABASE_URL not configured",
        };
    }

    try {
        const startTime = Date.now();
        const db = getDb();

        await withTimeout(
            db.execute(sql`SELECT 1`),
            CHECK_TIMEOUT_MS,
            "Database check timed out"
        );

        const latencyMs = Date.now() - startTime;

        if (latencyMs > DB_LATENCY_THRESHOLD_MS) {
            return {
                name,
                status: "unhealthy",
                latencyMs,
                error: `High latency: ${latencyMs}ms exceeds ${DB_LATENCY_THRESHOLD_MS}ms threshold`,
            };
        }

        return { name, status: "healthy", latencyMs };
    } catch (error) {
        return {
            name,
            status: "unhealthy",
            error:
                error instanceof Error
                    ? error.message
                    : "Database query failed",
        };
    }
}

/**
 * Check Redis cache connectivity (optional - degraded if unavailable)
 */
async function checkCache(): Promise<HealthCheck> {
    const name = "cache";

    if (!isRedisAvailable()) {
        // Cache is optional - being unavailable doesn't make the app not ready
        // But we still report it for observability
        return {
            name,
            status: "healthy",
            latencyMs: 0,
            error: "Redis not configured (optional)",
        };
    }

    try {
        const redis = getRedis();
        if (!redis) {
            return {
                name,
                status: "healthy",
                latencyMs: 0,
                error: "Redis client unavailable (optional)",
            };
        }

        const startTime = Date.now();

        const pong = await withTimeout(
            redis.ping(),
            CHECK_TIMEOUT_MS,
            "Cache check timed out"
        );

        const latencyMs = Date.now() - startTime;

        if (pong !== "PONG") {
            return {
                name,
                status: "unhealthy",
                latencyMs,
                error: "Unexpected PING response",
            };
        }

        if (latencyMs > CACHE_LATENCY_THRESHOLD_MS) {
            return {
                name,
                status: "unhealthy",
                latencyMs,
                error: `High latency: ${latencyMs}ms exceeds ${CACHE_LATENCY_THRESHOLD_MS}ms threshold`,
            };
        }

        return { name, status: "healthy", latencyMs };
    } catch (error) {
        // Cache failures make app not ready only if Redis is required
        // For most apps, cache being down is acceptable for readiness
        return {
            name,
            status: "healthy",
            latencyMs: 0,
            error:
                error instanceof Error ? error.message : "Cache check failed",
        };
    }
}

/**
 * Check required environment variables
 */
function checkEnvironment(): HealthCheck {
    const name = "environment";
    const requiredVars = ["DATABASE_URL"];
    const missingVars = requiredVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
        return {
            name,
            status: "unhealthy",
            error: `Missing required env vars: ${missingVars.join(", ")}`,
        };
    }

    return { name, status: "healthy" };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * GET /api/readyz - Readiness probe endpoint
 *
 * Status codes:
 * - 200: Application is ready to receive traffic
 * - 503: Application is not ready (do not route traffic)
 *
 * @returns Readiness status with individual check results
 */
export async function GET(): Promise<Response> {
    try {
        // Run all checks in parallel with overall timeout protection
        const checksPromise = Promise.all([
            checkDatabase(),
            checkCache(),
            Promise.resolve(checkEnvironment()),
        ]);

        const checks = await withTimeout(
            checksPromise,
            CHECK_TIMEOUT_MS,
            "Readiness checks timed out"
        );

        // Determine overall readiness - all critical checks must be healthy
        // Database and environment are critical; cache is optional
        const criticalChecks = checks.filter(
            (c) => c.name === "database" || c.name === "environment"
        );
        const allCriticalHealthy = criticalChecks.every(
            (c) => c.status === "healthy"
        );

        const response: ReadinessResponse = {
            status: allCriticalHealthy ? "ready" : "not_ready",
            timestamp: new Date().toISOString(),
            checks,
        };

        return Response.json(response, {
            status: allCriticalHealthy ? 200 : 503,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Probe-Type": "readiness",
            },
        });
    } catch (error) {
        logger.error("[Readiness Check] Failed", {
            error: error instanceof Error ? error.message : String(error),
        });

        const response: ReadinessResponse = {
            status: "not_ready",
            timestamp: new Date().toISOString(),
            checks: [
                {
                    name: "overall",
                    status: "unhealthy",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Readiness check failed",
                },
            ],
        };

        return Response.json(response, {
            status: 503,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Probe-Type": "readiness",
            },
        });
    }
}
