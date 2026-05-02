import "server-only"

import { Redis } from "@upstash/redis"

/**
 * Upstash Redis client for rate limiting and operational data.
 *
 * NOT used for data caching — all data reads use `'use cache'` + `cacheTag`
 * at the page/feature layer. Redis is scoped to rate limiting only.
 *
 * Environment guard:
 * - Production: throws if CACHE_KV_REST_API_URL / CACHE_KV_REST_API_TOKEN are missing
 *   (rate limiting is a security control and must not silently degrade in prod).
 * - Development: logs a warning once and returns null (local dev without Redis is fine).
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production"

// Singleton across HMR / warm container reuse
const globalForRedis = globalThis as unknown as {
	__upstashRedis?: Redis
	__upstashRedisInitFailed?: boolean
	__upstashRedisMissingEnvWarned?: boolean
}

async function withRedisClient<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
	try {
		const client = getClient()
		if (!client) return null
		return await operation(client)
	} catch {
		return null
	}
}

function getClient(): Redis | null {
	if (globalForRedis.__upstashRedis) {
		return globalForRedis.__upstashRedis
	}

	if (globalForRedis.__upstashRedisInitFailed) {
		return null
	}

	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) {
		if (IS_PRODUCTION) {
			throw new Error(
				"[Redis] Missing required environment variables: " +
					`${!url ? "CACHE_KV_REST_API_URL " : ""}${!token ? "CACHE_KV_REST_API_TOKEN" : ""}`.trim() +
					". Rate limiting requires Redis in production.",
			)
		}
		if (!globalForRedis.__upstashRedisMissingEnvWarned) {
			globalForRedis.__upstashRedisMissingEnvWarned = true
			console.warn(
				"[Redis] CACHE_KV_REST_API_URL and/or CACHE_KV_REST_API_TOKEN not set. " +
					"Rate limiting is disabled. Set these env vars to enable Redis.",
			)
		}
		return null
	}

	try {
		globalForRedis.__upstashRedis = new Redis({ url, token })
		delete globalForRedis.__upstashRedisInitFailed
		return globalForRedis.__upstashRedis
	} catch {
		globalForRedis.__upstashRedisInitFailed = true
		return null
	}
}

/** Increment a key's integer value. Returns new value or null on failure. */
export async function incr(key: string): Promise<number | null> {
	return withRedisClient((client) => client.incr(key))
}

/** Set a TTL (in seconds) on a key. Returns true/false or null on failure. */
export async function expire(key: string, seconds: number): Promise<boolean | null> {
	return withRedisClient(async (client) => {
		const result = await client.expire(key, seconds)
		return result === 1
	})
}

/** Ping the Redis server. Returns "PONG" or null on failure/missing config. */
export async function ping(): Promise<string | null> {
	return withRedisClient((client) => client.ping())
}
