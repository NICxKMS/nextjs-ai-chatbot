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
}

function getClient(): Redis | null {
	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) {
		return null
	}

	if (!globalForRedis.__upstashRedis) {
		globalForRedis.__upstashRedis = new Redis({ url, token })
	}

	return globalForRedis.__upstashRedis
}

/** Increment a key's integer value. Returns new value or null on failure. */
export async function incr(key: string): Promise<number | null> {
	try {
		const client = getClient()
		if (!client) return null
		return await client.incr(key)
	} catch {
		return null
	}
}

/** Set a TTL (in seconds) on a key. Returns true/false or null on failure. */
export async function expire(key: string, seconds: number): Promise<boolean | null> {
	try {
		const client = getClient()
		if (!client) return null
		// Upstash expire returns 0 | 1
		const result = await client.expire(key, seconds)
		return result === 1
	} catch {
		return null
	}
}

/** Get a typed value by key. Returns the value or null on failure/miss. */
export async function get<T>(key: string): Promise<T | null> {
	try {
		const client = getClient()
		if (!client) return null
		return await client.get<T>(key)
	} catch {
		return null
	}
}

/** Set a key to a value, with optional TTL in seconds. Returns "OK" or null on failure. */
export async function set(key: string, value: unknown, ttl?: number): Promise<string | null> {
	try {
		const client = getClient()
		if (!client) return null
		if (ttl !== undefined) {
			const result = await client.set(key, value, { ex: ttl })
			return result as string | null
		}
		const result = await client.set(key, value)
		return result as string | null
	} catch {
		return null
	}
}

/** Delete one or more keys. Returns count of deleted keys or null on failure. */
export async function del(...keys: string[]): Promise<number | null> {
	try {
		const client = getClient()
		if (!client) return null
		return await client.del(...keys)
	} catch {
		return null
	}
}

/** Ping the Redis server. Returns "PONG" or null on failure/missing config. */
export async function ping(): Promise<string | null> {
	try {
		const client = getClient()
		if (!client) return null
		return await client.ping()
	} catch {
		return null
	}
}
