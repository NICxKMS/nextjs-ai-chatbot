import { sql } from "drizzle-orm"

import { ping } from "@/lib/cache/client"
import { db } from "@/lib/db/client"

type HealthStatus = "healthy" | "degraded" | "unhealthy"

interface CheckResult {
	status: HealthStatus
	latency?: number
	error?: string
}

interface HealthResponse {
	status: HealthStatus
	timestamp: string
	checks: {
		database: CheckResult
		cache: CheckResult
	}
}

/** High-latency threshold in milliseconds. */
const LATENCY_THRESHOLD_MS = 1000

function toErrorMessage(error: unknown, fallbackMessage: string) {
	return error instanceof Error ? error.message : fallbackMessage
}

function createLatencyResult(latency: number, highLatencyMessage: string): CheckResult {
	if (latency > LATENCY_THRESHOLD_MS) {
		return { status: "degraded", latency, error: highLatencyMessage }
	}

	return { status: "healthy", latency }
}

function createFailureResult(error: unknown, fallbackMessage: string): CheckResult {
	return {
		status: "unhealthy",
		error: toErrorMessage(error, fallbackMessage),
	}
}

async function checkDatabase(): Promise<CheckResult> {
	try {
		const start = Date.now()
		await db.execute(sql`SELECT 1`)
		return createLatencyResult(Date.now() - start, "High database latency")
	} catch (error) {
		return createFailureResult(error, "Database check failed")
	}
}

async function checkCache(): Promise<CheckResult> {
	try {
		const start = Date.now()
		const result = await ping()
		const latency = Date.now() - start

		if (result === null) {
			return { status: "degraded", error: "Cache not configured or unavailable" }
		}

		return createLatencyResult(latency, "High cache latency")
	} catch (error) {
		return createFailureResult(error, "Cache check failed")
	}
}

function deriveOverallStatus(checks: HealthResponse["checks"]): HealthStatus {
	const statuses = Object.values(checks).map((c) => c.status)

	if (statuses.includes("unhealthy")) return "unhealthy"
	if (statuses.includes("degraded")) return "degraded"
	return "healthy"
}

export async function GET() {
	const [database, cache] = await Promise.all([checkDatabase(), checkCache()])

	const checks = { database, cache }
	const status = deriveOverallStatus(checks)

	const body: HealthResponse = {
		status,
		timestamp: new Date().toISOString(),
		checks,
	}

	return Response.json(body, {
		status: status === "unhealthy" ? 503 : 200,
	})
}
