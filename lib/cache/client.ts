import "server-only"

import { Redis } from "@upstash/redis"

/**
 * Upstash Redis client for rate limiting and operational data.
 *
 * NOT used for data caching — all data reads use `'use cache'` + `cacheTag`
 * at the page/feature layer. Redis is scoped to rate limiting only.
 *
 * Graceful degradation: all operations return null on failure or missing env vars.
 */

// Singleton across HMR / warm container reuse
const globalForRedis = globalThis as unknown as {
	__upstashRedis?: Redis
	__upstashRedisInitFailed?: boolean
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
	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) {
		return null
	}

	if (globalForRedis.__upstashRedis) {
		return globalForRedis.__upstashRedis
	}

	if (globalForRedis.__upstashRedisInitFailed) {
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
