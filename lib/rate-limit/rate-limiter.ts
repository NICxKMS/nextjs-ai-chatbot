/**
 * Rate Limiter Implementation
 *
 * Provides distributed rate limiting using Redis with sliding window algorithm.
 * Designed for serverless environments using Upstash Redis.
 *
 * @module lib/rate-limit/rate-limiter
 */

import { Ratelimit } from "@upstash/ratelimit"
import { getRedisClient, isRedisAvailable } from "@/lib/cache/client"
import { logDebug, logWarn } from "@/lib/log"

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a rate limit check operation.
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	success: boolean
	/** Maximum number of requests allowed in the window */
	limit: number
	/** Number of requests remaining in the current window */
	remaining: number
	/** Unix timestamp (ms) when the rate limit resets */
	reset: number
}

/**
 * Configuration for a rate limit.
 */
export interface RateLimitConfig {
	/** Maximum number of requests allowed */
	limit: number
	/** Time window in seconds */
	window: number
	/** Optional prefix for Redis keys */
	prefix?: string
}

/**
 * Options for rate limiter operations.
 */
export interface RateLimitOptions {
	/** If true, deny requests when Redis is unavailable (default: false) */
	failClosed?: boolean
}

// =============================================================================
// Rate Limiter Class
// =============================================================================

/**
 * Rate limiter using Redis with sliding window algorithm.
 *
 * Provides distributed rate limiting for API endpoints, authentication,
 * and other operations requiring request throttling.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({ limit: 10, window: 60 });
 *
 * const result = await limiter.check('user:123');
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 * ```
 */
export class RateLimiter {
	private ratelimit: Ratelimit | null = null
	private readonly config: RateLimitConfig
	private readonly options: RateLimitOptions

	/**
	 * Create a new rate limiter instance.
	 *
	 * @param config - Rate limit configuration
	 * @param options - Additional options
	 */
	constructor(config: RateLimitConfig, options: RateLimitOptions = {}) {
		this.config = config
		this.options = options
		this.initializeRatelimit()
	}

	/**
	 * Initialize the underlying Ratelimit instance.
	 */
	private initializeRatelimit(): void {
		const redis = getRedisClient()

		if (!redis) {
			logDebug("Rate limiter initialized without Redis - will fail open")
			return
		}

		this.ratelimit = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(
				this.config.limit,
				`${this.config.window} s`,
			),
			prefix: this.config.prefix ?? "ratelimit",
			analytics: true,
		})

		logDebug("Rate limiter initialized", {
			limit: this.config.limit,
			window: this.config.window,
			prefix: this.config.prefix ?? "ratelimit",
		})
	}

	/**
	 * Check if a request is allowed without consuming a token.
	 *
	 * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
	 * @returns Rate limit result with remaining count
	 */
	async checkLimit(key: string): Promise<RateLimitResult> {
		return this.performLimitCheck(key, false)
	}

	/**
	 * Consume a token and check if the request is allowed.
	 * This increments the request counter for the key.
	 *
	 * @param key - Unique identifier for the rate limit
	 * @returns Rate limit result with updated remaining count
	 */
	async consumeToken(key: string): Promise<RateLimitResult> {
		return this.performLimitCheck(key, true)
	}

	/**
	 * Internal method to perform rate limit check.
	 *
	 * @param key - Unique identifier
	 * @param consume - Whether to consume a token
	 * @returns Rate limit result
	 */
	private async performLimitCheck(
		key: string,
		consume: boolean,
	): Promise<RateLimitResult> {
		// Handle Redis unavailability
		if (!this.ratelimit) {
			if (this.options.failClosed) {
				return this.createDeniedResult()
			}
			return this.createAllowedResult()
		}

		try {
			if (consume) {
				const result = await this.ratelimit.limit(key)
				return {
					success: result.success,
					limit: result.limit,
					remaining: result.remaining,
					reset: result.reset,
				}
			}

			// getRemaining returns { remaining, reset, limit } without success field
			const result = await this.ratelimit.getRemaining(key)
			return {
				success: result.remaining > 0,
				limit: result.limit,
				remaining: result.remaining,
				reset: result.reset,
			}
		} catch (error) {
			logWarn("Rate limit check failed", { error, key })

			if (this.options.failClosed) {
				return this.createDeniedResult()
			}
			return this.createAllowedResult()
		}
	}

	/**
	 * Reset the rate limit for a specific key.
	 *
	 * @param key - Unique identifier to reset
	 */
	async resetLimit(key: string): Promise<void> {
		if (!this.ratelimit) {
			return
		}

		try {
			// Use the underlying Redis client to delete the key
			const redis = getRedisClient()
			if (redis) {
				const fullKey = `${this.config.prefix ?? "ratelimit"}:${key}`
				await redis.del(fullKey)
				logDebug("Rate limit reset", { key })
			}
		} catch (error) {
			logWarn("Failed to reset rate limit", { error, key })
		}
	}

	/**
	 * Get the remaining requests for a key without consuming a token.
	 *
	 * @param key - Unique identifier
	 * @returns Number of remaining requests
	 */
	async getRemaining(key: string): Promise<number> {
		const result = await this.checkLimit(key)
		return result.remaining
	}

	/**
	 * Create a result indicating the request is allowed.
	 * Used when Redis is unavailable and failClosed is false.
	 */
	private createAllowedResult(): RateLimitResult {
		return {
			success: true,
			limit: this.config.limit,
			remaining: this.config.limit,
			reset: Date.now() + this.config.window * 1000,
		}
	}

	/**
	 * Create a result indicating the request is denied.
	 * Used when Redis is unavailable and failClosed is true.
	 */
	private createDeniedResult(): RateLimitResult {
		return {
			success: false,
			limit: this.config.limit,
			remaining: 0,
			reset: Date.now() + this.config.window * 1000,
		}
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a rate limiter with custom configuration.
 *
 * @param config - Rate limit configuration
 * @param options - Additional options
 * @returns RateLimiter instance
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   limit: 100,
 *   window: 60,
 *   prefix: 'api'
 * });
 * ```
 */
export function createRateLimiter(
	config: RateLimitConfig,
	options?: RateLimitOptions,
): RateLimiter {
	return new RateLimiter(config, options)
}

/**
 * Check if rate limiting is available.
 * Returns false if Redis is not configured.
 *
 * @returns true if rate limiting is available
 */
export function isRateLimitAvailable(): boolean {
	return isRedisAvailable()
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get client IP from request headers.
 * Works in both Edge and Node.js runtimes.
 *
 * @param request - The incoming request
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(request: Request): string {
	const forwardedFor = request.headers.get("x-forwarded-for")
	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim() ?? "unknown"
	}

	const realIP = request.headers.get("x-real-ip")
	if (realIP) {
		return realIP
	}

	return "unknown"
}

/**
 * Calculate retry-after time in seconds.
 *
 * @param resetTime - Unix timestamp (ms) when the rate limit resets
 * @returns Seconds until reset
 */
export function getRetryAfter(resetTime: number): number {
	return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000))
}

/**
 * Create rate limit headers for HTTP responses.
 *
 * @param result - Rate limit result
 * @returns Headers object with rate limit info
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
	const headers = new Headers()
	headers.set("X-RateLimit-Limit", result.limit.toString())
	headers.set("X-RateLimit-Remaining", result.remaining.toString())
	headers.set("X-RateLimit-Reset", result.reset.toString())

	if (!result.success) {
		const retryAfter = getRetryAfter(result.reset)
		headers.set("Retry-After", retryAfter.toString())
	}

	return headers
}
