/**
 * Playwright global setup — runs once before all tests.
 *
 * Clears rate-limit keys from Upstash Redis so that parallel test workers
 * don't hit the 5 login/min and 3 register/min per-IP limits.
 *
 * The rate limiter uses key pattern `@app/ratelimit:rate-limit-*`.
 * We scan for these keys and delete them before the test run starts.
 */

import { existsSync } from "node:fs"

// Load .env.local to get Upstash credentials (same as playwright.config.ts)
if (existsSync(".env.local")) {
	process.loadEnvFile(".env.local")
}

/** Execute a Redis command via the Upstash REST API. */
async function upstashCommand(url: string, token: string, command: unknown[]): Promise<unknown> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(command),
	})

	if (!response.ok) {
		const body = await response.text()
		console.warn(`Upstash command failed (${response.status}): ${body}`)
		return null
	}

	const data = await response.json()
	return data.result
}

async function globalSetup() {
	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) {
		console.log("[E2E Setup] No Upstash credentials — skipping rate limit flush")
		return
	}

	console.log("[E2E Setup] Clearing rate limit keys from Redis...")

	// Find all rate limit keys (pattern: @app/ratelimit:*)
	const keys = (await upstashCommand(url, token, ["KEYS", "@app/ratelimit:*"])) as string[] | null

	if (!keys || keys.length === 0) {
		console.log("[E2E Setup] No rate limit keys found — clean slate")
		return
	}

	// Delete all found keys in a single DEL call
	await upstashCommand(url, token, ["DEL", ...keys])
	console.log(`[E2E Setup] Deleted ${keys.length} rate limit key(s)`)
}

// Playwright requires a default export for globalSetup
// biome-ignore lint/style/noDefaultExport: Playwright global setup convention
export default globalSetup
