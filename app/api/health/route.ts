/**
 * Health Check API Route
 *
 * Returns system health status for monitoring and uptime checks.
 * Uses publicMiddleware for rate limiting (100 req/min per IP).
 *
 * @module app/api/health/route
 */

import { sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getRedisClient, isRedisAvailable } from "@/lib/cache"
import { db } from "@/lib/db"
import { publicMiddleware } from "@/lib/middleware"

/** Health status type */
type HealthStatus = "healthy" | "degraded" | "unhealthy"

/** Health check result */
type HealthCheckResult = {
	status: HealthStatus
	latency?: number
	error?: string
}

/** Health response */
type HealthResponse = {
	status: HealthStatus
	timestamp: string
	checks: {
		database: HealthCheckResult
		cache: HealthCheckResult
		environment: HealthCheckResult
	}
}

/** Check database connectivity */
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
	if (!process.env.DATABASE_URL) {
		return { status: "unhealthy", error: "DATABASE_URL not configured" }
	}

	try {
		const startTime = Date.now()
		await db.execute(sql`SELECT 1`)
		const latency = Date.now() - startTime

		if (latency > 1000) {
			return {
				status: "degraded",
				latency,
				error: "High database latency",
			}
		}

		return { status: "healthy", latency }
	} catch (error) {
		return {
			status: "unhealthy",
			error:
				error instanceof Error
					? error.message
					: "Database query failed",
		}
	}
}

/** Check Redis cache connectivity */
async function checkCacheHealth(): Promise<HealthCheckResult> {
	if (!isRedisAvailable()) {
		return { status: "degraded", error: "Redis not configured" }
	}

	try {
		const startTime = Date.now()
		const redis = getRedisClient()
		if (!redis) {
			return { status: "degraded", error: "Redis client unavailable" }
		}
		await redis.ping()
		const latency = Date.now() - startTime

		return { status: "healthy", latency }
	} catch (error) {
		return {
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Redis ping failed",
		}
	}
}

/** Check critical environment variables */
function checkEnvironmentHealth(): HealthCheckResult {
	const requiredVars = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"]
	const missingVars = requiredVars.filter((v) => !process.env[v])

	if (missingVars.length > 0) {
		return {
			status: "unhealthy",
			error: `Missing env vars: ${missingVars.join(", ")}`,
		}
	}

	return { status: "healthy" }
}

/** Determine overall status from checks */
function determineOverallStatus(
	checks: HealthResponse["checks"],
): HealthStatus {
	const statuses = Object.values(checks).map((c) => c.status)

	if (statuses.includes("unhealthy")) return "unhealthy"
	if (statuses.includes("degraded")) return "degraded"
	return "healthy"
}

/**
 * Health check handler implementation.
 */
async function healthHandler(_req: NextRequest): Promise<NextResponse> {
	try {
		const [dbHealth, cacheHealth, envHealth] = await Promise.all([
			checkDatabaseHealth(),
			checkCacheHealth(),
			Promise.resolve(checkEnvironmentHealth()),
		])

		const checks = {
			database: dbHealth,
			cache: cacheHealth,
			environment: envHealth,
		}

		const overallStatus = determineOverallStatus(checks)

		const health: HealthResponse = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			checks,
		}

		const httpStatus = overallStatus === "unhealthy" ? 503 : 200

		return NextResponse.json(health, {
			status: httpStatus,
			headers: { "Cache-Control": "public, max-age=0" },
		})
	} catch {
		const errorResponse: HealthResponse = {
			status: "unhealthy",
			timestamp: new Date().toISOString(),
			checks: {
				database: { status: "unhealthy", error: "Check failed" },
				cache: { status: "unhealthy", error: "Check failed" },
				environment: { status: "unhealthy", error: "Check failed" },
			},
		}

		return NextResponse.json(errorResponse, {
			status: 503,
			headers: { "Cache-Control": "public, max-age=0" },
		})
	}
}

/**
 * GET /api/health
 * Health check endpoint for monitoring.
 * Rate limited via publicMiddleware (100 req/min per IP).
 */
export const GET = publicMiddleware(healthHandler)
