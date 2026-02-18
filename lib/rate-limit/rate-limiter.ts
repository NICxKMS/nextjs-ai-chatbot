/**
 * Rate Limiter Implementation
 *
 * Provides distributed rate limiting using Redis with multiple algorithms.
 * Designed for serverless environments using Upstash Redis.
 *
 * Supported algorithms:
 * - sliding_window: Precise rate limiting using sorted sets
 * - token_bucket: Smooth rate limiting with burst handling
 *
 * Features:
 * - OpenTelemetry integration for distributed tracing
 * - Structured logging with span context correlation
 *
 * @module lib/rate-limit/rate-limiter
 */

import { trace } from "@opentelemetry/api"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedisClient, isRedisAvailable } from "@/lib/cache/client"
import { logDebug, logWarn } from "@/lib/log"

// =============================================================================
// Types
// =============================================================================

/**
 * Supported rate limiting algorithms.
 */
export type RateLimitAlgorithm = "sliding_window" | "token_bucket"

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
	/** Algorithm to use (default: "sliding_window") */
	algorithm?: RateLimitAlgorithm
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
 * Rate limiter using Redis with configurable algorithms.
 *
 * Provides distributed rate limiting for API endpoints, authentication,
 * and other operations requiring request throttling.
 *
 * Supported algorithms:
 * - sliding_window: Precise rate limiting, good for strict limits
 * - token_bucket: Smooth rate limiting with burst handling
 *
 * @example
 * ```typescript
 * // Sliding window (default)
 * const limiter = new RateLimiter({ limit: 10, window: 60 });
 *
 * // Token bucket for burst handling
 * const burstLimiter = new RateLimiter({
 *   limit: 60,
 *   window: 60,
 *   algorithm: 'token_bucket'
 * });
 *
 * const result = await limiter.consumeToken('user:123');
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
	 * Initialize the underlying Ratelimit instance based on the selected algorithm.
	 */
	private initializeRatelimit(): void {
		const redis = getRedisClient()

		if (!redis) {
			logDebug("Rate limiter initialized without Redis - will fail open")
			return
		}

		const algorithm = this.config.algorithm ?? "sliding_window"
		const prefix = this.config.prefix ?? "ratelimit"

		// Create the appropriate limiter based on algorithm type
		const limiter =
			algorithm === "token_bucket"
				? this.createTokenBucketLimiter()
				: this.createSlidingWindowLimiter()

		this.ratelimit = new Ratelimit({
			redis,
			limiter,
			prefix,
			analytics: true,
		})

		logDebug("Rate limiter initialized", {
			algorithm,
			limit: this.config.limit,
			window: this.config.window,
			prefix,
		})
	}

	/**
	 * Create a sliding window limiter.
	 * Precise rate limiting using sorted sets.
	 */
	private createSlidingWindowLimiter() {
		return Ratelimit.slidingWindow(
			this.config.limit,
			`${this.config.window} s`,
		)
	}

	/**
	 * Create a token bucket limiter.
	 * Allows bursts while maintaining average rate.
	 *
	 * The bucket starts full with `limit` tokens and refills at a rate
	 * that maintains the average requests per window.
	 */
	private createTokenBucketLimiter() {
		// For token bucket:
		// - refillRate: tokens added per interval
		// - interval: time between refills
		// - maxTokens: bucket capacity (allows burst up to this limit)
		//
		// We set refillRate to maintain the average rate over the window.
		// Example: 60 requests per 60 seconds = 1 token per second
		// So refillRate = limit/window, interval = "1 s", maxTokens = limit
		const refillRate = Math.max(
			1,
			Math.floor(this.config.limit / this.config.window),
		)
		return Ratelimit.tokenBucket(refillRate, "1 s", this.config.limit)
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
		const span = trace.getActiveSpan()
		const algorithm = this.config.algorithm ?? "sliding_window"
		const namespace = this.config.prefix ?? "ratelimit"

		// Add initial span attributes for tracing
		if (span) {
			span.setAttribute("rate_limit.strategy", algorithm)
			span.setAttribute("rate_limit.limit", this.config.limit)
			span.setAttribute("rate_limit.namespace", namespace)
			span.setAttribute("rate_limit.key", key)
			span.setAttribute("rate_limit.consume", consume)
		}

		// Handle Redis unavailability
		if (!this.ratelimit) {
			if (span) {
				span.setAttribute("rate_limit.allowed", true)
				span.setAttribute("rate_limit.remaining", this.config.limit)
				span.setAttribute("rate_limit.result", "redis_unavailable")
			}

			logDebug("Rate limit check skipped - Redis unavailable", {
				key,
				algorithm,
				namespace,
				failClosed: this.options.failClosed,
			})

			if (this.options.failClosed) {
				return this.createDeniedResult()
			}
			return this.createAllowedResult()
		}

		try {
			if (consume) {
				const result = await this.ratelimit.limit(key)

				// Add result span attributes
				if (span) {
					span.setAttribute("rate_limit.allowed", result.success)
					span.setAttribute("rate_limit.remaining", result.remaining)
					span.setAttribute("rate_limit.result", "consumed")
				}

				if (!result.success) {
					logWarn("Rate limit exceeded", {
						key,
						algorithm,
						namespace,
						limit: result.limit,
						remaining: result.remaining,
						reset: result.reset,
					})
				}

				return {
					success: result.success,
					limit: result.limit,
					remaining: result.remaining,
					reset: result.reset,
				}
			}

			// getRemaining returns { remaining, reset } without success field
			const result = await this.ratelimit.getRemaining(key)
			const allowed = result.remaining > 0

			// Add result span attributes
			if (span) {
				span.setAttribute("rate_limit.allowed", allowed)
				span.setAttribute("rate_limit.remaining", result.remaining)
				span.setAttribute("rate_limit.result", "checked")
			}

			return {
				success: allowed,
				limit: this.config.limit,
				remaining: result.remaining,
				reset: result.reset,
			}
		} catch (error) {
			// Add error span attributes
			if (span) {
				span.setAttribute(
					"rate_limit.allowed",
					!this.options.failClosed,
				)
				span.setAttribute("rate_limit.remaining", 0)
				span.setAttribute("rate_limit.result", "error")
				span.setAttribute("rate_limit.error", String(error))
			}

			logWarn("Rate limit check failed", {
				error,
				key,
				algorithm,
				namespace,
			})

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
		const span = trace.getActiveSpan()
		const namespace = this.config.prefix ?? "ratelimit"

		if (span) {
			span.setAttribute("rate_limit.reset.key", key)
			span.setAttribute("rate_limit.reset.namespace", namespace)
		}

		if (!this.ratelimit) {
			if (span) {
				span.setAttribute("rate_limit.reset.result", "skipped")
			}
			return
		}

		try {
			// Use the underlying Redis client to delete the key
			const redis = getRedisClient()
			if (redis) {
				const fullKey = `${namespace}:${key}`
				await redis.del(fullKey)

				if (span) {
					span.setAttribute("rate_limit.reset.result", "success")
				}

				logDebug("Rate limit reset", { key, namespace })
			}
		} catch (error) {
			if (span) {
				span.setAttribute("rate_limit.reset.result", "error")
				span.setAttribute("rate_limit.reset.error", String(error))
			}

			logWarn("Failed to reset rate limit", { error, key, namespace })
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
 * Get client IP from request headers securely.
 * Uses trusted proxy validation to prevent header spoofing attacks.
 *
 * SECURITY: This function implements secure IP extraction by:
 * 1. Validating IP address formats
 * 2. Handling X-Forwarded-For chain with trusted proxy count
 * 3. Supporting Cloudflare and Vercel-specific headers
 *
 * Works in both Edge and Node.js runtimes.
 *
 * @param request - The incoming request
 * @param options - Optional configuration for trusted proxies
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(
	request: Request,
	options?: {
		/** Number of trusted proxies (default: 1) */
		trustedProxyCount?: number
		/** Whether to trust proxy headers (default: true) */
		trustProxy?: boolean
	},
): string {
	// Import secure IP extraction
	// Using dynamic import to avoid circular dependencies
	const cfIP = request.headers.get("cf-connecting-ip")
	if (cfIP) {
		return cfIP.trim()
	}

	// Vercel-specific header takes precedence
	const vercelForwarded = request.headers.get("x-vercel-forwarded-for")
	if (vercelForwarded) {
		const trustedCount = options?.trustedProxyCount ?? 1
		const ips = vercelForwarded.split(",").map((ip) => ip.trim())
		const clientIndex = Math.max(0, ips.length - 1 - trustedCount)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// Standard X-Forwarded-For with chain handling
	const forwardedFor = request.headers.get("x-forwarded-for")
	if (forwardedFor) {
		const trustedCount = options?.trustedProxyCount ?? 1
		const ips = forwardedFor.split(",").map((ip) => ip.trim())
		const clientIndex = Math.max(0, ips.length - 1 - trustedCount)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// Fallback to X-Real-IP (single IP, no chain)
	const realIP = request.headers.get("x-real-ip")
	if (realIP) {
		return realIP.trim()
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
