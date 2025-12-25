/**
 * Health Check API Route
 * Ref: System health monitoring endpoint
 *
 * @module app/api/health/route
 *
 * NOTE: This is the legacy health check endpoint maintained for backwards compatibility.
 * For Kubernetes deployments, prefer:
 * - /api/healthz - Liveness probe (is the process alive?)
 * - /api/readyz - Readiness probe (is the app ready for traffic?)
 */

import { sql } from "drizzle-orm";
import { getRedis, isRedisAvailable } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

// =============================================================================
// HEALTH CHECK CONSTANTS
// =============================================================================

/** Maximum acceptable database latency in milliseconds before marking as degraded */
const DB_LATENCY_THRESHOLD_MS = 1000;

/** Maximum acceptable cache latency in milliseconds before marking as degraded */
const CACHE_LATENCY_THRESHOLD_MS = 500;

/** Cache TTL for health check responses in milliseconds */
const HEALTH_CACHE_TTL_MS = 5000;

/** Maximum acceptable external API latency in milliseconds */
const EXTERNAL_API_LATENCY_THRESHOLD_MS = 2000;

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
        external?: HealthCheckResult;
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

        // Warn if latency is high
        if (latency > DB_LATENCY_THRESHOLD_MS) {
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

        // Warn if latency exceeds threshold
        if (latency > CACHE_LATENCY_THRESHOLD_MS) {
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
            error:
                error instanceof Error ? error.message : "Cache check failed",
        };
    }
}

/**
 * Check external service connectivity (P4-031)
 * Tests connectivity to critical external APIs (e.g., Supabase auth)
 */
async function checkExternalServiceHealth(): Promise<HealthCheckResult> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Skip if Supabase is not configured
    if (!supabaseUrl) {
        return {
            status: "degraded",
            latency: 0,
            error: "Supabase URL not configured",
        };
    }

    try {
        const startTime = Date.now();

        // Ping Supabase health endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            EXTERNAL_API_LATENCY_THRESHOLD_MS
        );

        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: "HEAD",
            signal: controller.signal,
            headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
            },
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        // Even 400/401 means the service is reachable
        if (response.status >= 500) {
            return {
                status: "unhealthy",
                latency,
                error: `Supabase returned ${response.status}`,
            };
        }

        // Warn if latency exceeds threshold
        if (latency > EXTERNAL_API_LATENCY_THRESHOLD_MS) {
            return {
                status: "degraded",
                latency,
                error: "High external service latency",
            };
        }

        return { status: "healthy", latency };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return {
                status: "degraded",
                latency: EXTERNAL_API_LATENCY_THRESHOLD_MS,
                error: "External service timeout",
            };
        }
        return {
            status: "degraded",
            latency: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "External service check failed",
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
    const statuses = Object.values(checks)
        .filter((c): c is HealthCheckResult => c !== undefined)
        .map((c) => c.status);

    if (statuses.includes("unhealthy")) {
        return "unhealthy";
    }
    if (statuses.includes("degraded")) {
        return "degraded";
    }
    return "healthy";
}

/**
 * Health check response cache
 * Prevents DB/Redis calls on every health check during load tests
 * TTL of 5 seconds balances freshness with performance
 *
 * NOTE: Module-level cache has limitations in serverless environments:
 * - Each serverless instance maintains its own cache
 * - Cache resets on cold starts
 * - This is intentional for edge-case tolerance - provides best-effort caching
 *   without external dependencies while remaining resilient to instance recycling
 */
type CachedHealth = {
    response: { status: string; timestamp: string; details?: unknown };
    httpStatus: number;
    timestamp: number;
};

let cachedHealth: CachedHealth | null = null;

/**
 * GET /api/health - Health check endpoint
 *
 * Status codes:
 * - 200: System healthy or degraded (still operational)
 * - 503: System unhealthy (critical failure)
 *
 * Security: In production, only minimal status is returned.
 * Detailed info (latency, errors, component status) is only shown in development.
 */
export async function GET(): Promise<Response> {
    const isDev = process.env.NODE_ENV === "development";

    // Return cached health response if still fresh (within TTL)
    // This prevents DB pool exhaustion during load tests
    if (
        cachedHealth &&
        Date.now() - cachedHealth.timestamp < HEALTH_CACHE_TTL_MS
    ) {
        return Response.json(cachedHealth.response, {
            status: cachedHealth.httpStatus,
            headers: {
                "Cache-Control": "public, max-age=0",
                "X-Health-Cache": "HIT",
            },
        });
    }

    try {
        const [dbHealth, envHealth, cacheHealth, externalHealth] =
            await Promise.all([
                checkDatabaseHealth(),
                Promise.resolve(checkEnvironmentHealth()),
                checkCacheHealth(),
                checkExternalServiceHealth(),
            ]);

        const checks: HealthResponse["checks"] = {
            database: dbHealth,
            environment: envHealth,
            cache: cacheHealth,
            external: externalHealth,
        };

        const overallStatus = determineOverallStatus(checks);
        const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

        // Production: minimal response to avoid exposing internal state
        // Development: full details for debugging
        const response = {
            status: overallStatus === "unhealthy" ? "error" : "ok",
            timestamp: new Date().toISOString(),
            ...(isDev && {
                details: {
                    status: overallStatus,
                    checks,
                },
            }),
        };

        // Cache the health response to prevent DB pool exhaustion under load
        cachedHealth = {
            response,
            httpStatus,
            timestamp: Date.now(),
        };

        return Response.json(response, {
            status: httpStatus,
            headers: {
                "Cache-Control": "public, max-age=0",
                "X-Health-Cache": "MISS",
            },
        });
    } catch (error) {
        logger.error("[Health Check] Failed", { error });

        // Production: minimal error response
        // Development: include error details
        const response = {
            status: "error",
            timestamp: new Date().toISOString(),
            ...(isDev && {
                details: {
                    status: "unhealthy" as HealthStatus,
                    checks: {
                        database: {
                            status: "unhealthy" as HealthStatus,
                            error: "Check failed",
                        },
                        environment: {
                            status: "unhealthy" as HealthStatus,
                            error: "Check failed",
                        },
                        cache: {
                            status: "unhealthy" as HealthStatus,
                            error: "Check failed",
                        },
                        external: {
                            status: "unhealthy" as HealthStatus,
                            error: "Check failed",
                        },
                    },
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                },
            }),
        };

        return Response.json(response, {
            status: 503,
            headers: { "Cache-Control": "public, max-age=0" },
        });
    }
}
