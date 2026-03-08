import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ── Types ──────────────────────────────────────────────────────

export type RateLimitResult = {
	/** Whether the request is within the rate limit. */
	allowed: boolean
	/** Seconds until the rate limit window resets. Present only when blocked. */
	retryAfter?: number
}

// ── Redis singleton for rate limiting ──────────────────────────

const globalForRedis = globalThis as unknown as {
	__rateLimitRedis?: Redis
	__rateLimitRedisInitFailed?: boolean
}

function getRedisClient(): Redis | null {
	const url = process.env.CACHE_KV_REST_API_URL
	const token = process.env.CACHE_KV_REST_API_TOKEN

	if (!url || !token) return null
	if (globalForRedis.__rateLimitRedis) return globalForRedis.__rateLimitRedis
	if (globalForRedis.__rateLimitRedisInitFailed) return null

	try {
		globalForRedis.__rateLimitRedis = new Redis({ url, token })
		delete globalForRedis.__rateLimitRedisInitFailed
		return globalForRedis.__rateLimitRedis
	} catch {
		globalForRedis.__rateLimitRedisInitFailed = true
		return null
	}
}

// ── Limiter instance cache (keyed by "limit:window") ──────────

const limiters = new Map<string, Ratelimit>()

function getRateLimiter(limit: number, windowSeconds: number): Ratelimit | null {
	const redis = getRedisClient()
	if (!redis) return null

	const cacheKey = `${limit}:${windowSeconds}`
	let limiter = limiters.get(cacheKey)
	if (!limiter) {
		limiter = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
			prefix: "@app/ratelimit",
		})
		limiters.set(cacheKey, limiter)
	}
	return limiter
}

// ── Internal implementation ────────────────────────────────────

async function performRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<RateLimitResult> {
	const limiter = getRateLimiter(limit, windowSeconds)
	if (!limiter) return { allowed: true } // Graceful degradation: Redis unavailable

	try {
		const result = await limiter.limit(key)
		if (result.success) return { allowed: true }

		const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
		return {
			allowed: false,
			retryAfter: retryAfter > 0 ? retryAfter : 1,
		}
	} catch {
		return { allowed: true } // Graceful degradation: SDK error
	}
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Check rate limit for the given key (boolean).
 *
 * Returns `true` if the request is within the limit.
 * Gracefully degrades to `true` if Redis is unavailable.
 *
 * Uses `@upstash/ratelimit` sliding window algorithm (atomic).
 */
export async function checkRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	const result = await performRateLimit(key, limit, windowSeconds)
	return result.allowed
}

/**
 * Check rate limit with detailed info including `retryAfter`.
 *
 * Gracefully degrades to `{ allowed: true }` if Redis is unavailable.
 *
 * Uses `@upstash/ratelimit` sliding window algorithm (atomic).
 */
export async function checkRateLimitWithInfo(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<RateLimitResult> {
	return performRateLimit(key, limit, windowSeconds)
}
