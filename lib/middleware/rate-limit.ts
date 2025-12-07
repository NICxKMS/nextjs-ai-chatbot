import "server-only";

import { trace } from "@opentelemetry/api";
import { getRedisClient } from "@/lib/cache/redis";
import { logError, logWarn } from "@/lib/log";

/**
 * ==============================================================================
 * RATE LIMITING MIDDLEWARE
 * ==============================================================================
 *
 * Provides flexible rate limiting for API endpoints.
 * Prevents abuse and ensures fair resource usage.
 *
 * Algorithms:
 * - Token Bucket: Smooth rate limiting with bursts
 * - Sliding Window: Precise rate limiting
 * - Fixed Window: Simple counter-based limiting
 *
 * Features:
 * - Multiple strategies (per-IP, per-user, per-API-key)
 * - Configurable windows and limits
 * - Redis-backed (distributed)
 * - Graceful degradation if Redis unavailable
 * - OpenTelemetry integration
 *
 * Use cases:
 * - Protect expensive endpoints
 * - Prevent API abuse
 * - Enforce tier limits (free/pro/enterprise)
 * - DDoS protection
 */

export type RateLimitStrategy =
	| "token_bucket"
	| "sliding_window"
	| "fixed_window";

export type RateLimitConfig = {
	/** Strategy to use */
	strategy?: RateLimitStrategy;
	/** Max requests per window */
	limit: number;
	/** Window duration in seconds */
	window: number;
	/** Identifier (IP, userId, apiKey, etc.) */
	identifier: string;
	/** Namespace for grouping (e.g., "api", "chat", "upload") */
	namespace?: string;
	/** Custom error message */
	errorMessage?: string;
};

export type RateLimitResult = {
	/** Whether request is allowed */
	allowed: boolean;
	/** Remaining requests in window */
	remaining: number;
	/** Limit for this identifier */
	limit: number;
	/** Time until reset (seconds) */
	resetIn: number;
	/** Retry after (seconds) - only if blocked */
	retryAfter?: number;
};

/**
 * Token Bucket Algorithm
 * Allows bursts while maintaining average rate
 */
class TokenBucketLimiter {
	async checkLimit(
		redis: ReturnType<typeof getRedisClient>,
		config: RateLimitConfig
	): Promise<RateLimitResult> {
		if (!redis) {
			// Fail open if Redis unavailable
			return {
				allowed: true,
				remaining: config.limit,
				limit: config.limit,
				resetIn: config.window,
			};
		}

		const key = this.getKey(config);
		const now = Date.now();

		// Get current bucket state
		const bucket = await redis.get<{
			tokens: number;
			lastRefill: number;
		}>(key);

		const tokensPerSecond = config.limit / config.window;
		let tokens: number;

		if (bucket) {
			// Refill tokens based on time elapsed
			const elapsedSeconds = (now - bucket.lastRefill) / 1000;
			const refillAmount = elapsedSeconds * tokensPerSecond;
			tokens = Math.min(config.limit, bucket.tokens + refillAmount);
		} else {
			// First request - full bucket
			tokens = config.limit;
		}

		// Check if request can proceed
		const allowed = tokens >= 1;

		if (allowed) {
			// Consume token
			tokens -= 1;
		}

		// Save bucket state
		await redis.set(
			key,
			{ tokens, lastRefill: now },
			{ ex: config.window * 2 }
		);

		const resetIn = Math.ceil((config.limit - tokens) / tokensPerSecond);

		return {
			allowed,
			remaining: Math.floor(tokens),
			limit: config.limit,
			resetIn,
			retryAfter: allowed ? undefined : Math.ceil(1 / tokensPerSecond),
		};
	}

	private getKey(config: RateLimitConfig): string {
		const namespace = config.namespace || "rate_limit";
		return `${namespace}:token_bucket:${config.identifier}`;
	}
}

/**
 * Sliding Window Algorithm
 * Precise rate limiting using sorted sets
 */
class SlidingWindowLimiter {
	async checkLimit(
		redis: ReturnType<typeof getRedisClient>,
		config: RateLimitConfig
	): Promise<RateLimitResult> {
		if (!redis) {
			return {
				allowed: true,
				remaining: config.limit,
				limit: config.limit,
				resetIn: config.window,
			};
		}

		const key = this.getKey(config);
		const now = Date.now();
		const windowStart = now - config.window * 1000;

		// Use Lua script for atomicity
		const script = `
			local key = KEYS[1]
			local now = tonumber(ARGV[1])
			local windowStart = tonumber(ARGV[2])
			local limit = tonumber(ARGV[3])
			local windowDuration = tonumber(ARGV[4])
			
			-- Remove old requests
			redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
			
			-- Count requests in window
			local count = redis.call('ZCARD', key)
			
			-- Check if allowed
			if count < limit then
				-- Add current request
				redis.call('ZADD', key, now, now)
				redis.call('EXPIRE', key, windowDuration)
				return {1, limit - count - 1}
			else
				-- Get oldest request in window
				local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
				local resetTime = 0
				if #oldest > 0 then
					resetTime = math.ceil((tonumber(oldest[2]) + windowDuration * 1000 - now) / 1000)
				end
				return {0, 0, resetTime}
			end
		`;

		const result = (await redis.eval(
			script,
			[key],
			[
				now.toString(),
				windowStart.toString(),
				config.limit.toString(),
				config.window.toString(),
			]
		)) as number[];

		const allowed = result[0] === 1;
		const remaining = result[1] || 0;
		const resetIn = result[2] || config.window;

		return {
			allowed,
			remaining,
			limit: config.limit,
			resetIn,
			retryAfter: allowed ? undefined : resetIn,
		};
	}

	private getKey(config: RateLimitConfig): string {
		const namespace = config.namespace || "rate_limit";
		return `${namespace}:sliding_window:${config.identifier}`;
	}
}

/**
 * Fixed Window Algorithm
 * Simple counter-based limiting
 */
class FixedWindowLimiter {
	async checkLimit(
		redis: ReturnType<typeof getRedisClient>,
		config: RateLimitConfig
	): Promise<RateLimitResult> {
		if (!redis) {
			return {
				allowed: true,
				remaining: config.limit,
				limit: config.limit,
				resetIn: config.window,
			};
		}

		const key = this.getKey(config);
		const now = Date.now();
		const windowStart = Math.floor(now / (config.window * 1000));

		const fullKey = `${key}:${windowStart}`;

		// Increment counter
		const count = await redis.incr(fullKey);

		if (count === 1) {
			// Set expiry on first request
			await redis.expire(fullKey, config.window * 2);
		}

		const allowed = count <= config.limit;
		const remaining = Math.max(0, config.limit - count);
		const resetIn = config.window - ((now / 1000) % config.window);

		return {
			allowed,
			remaining,
			limit: config.limit,
			resetIn: Math.ceil(resetIn),
			retryAfter: allowed ? undefined : Math.ceil(resetIn),
		};
	}

	private getKey(config: RateLimitConfig): string {
		const namespace = config.namespace || "rate_limit";
		return `${namespace}:fixed_window:${config.identifier}`;
	}
}

// Limiter instances
const limiters = {
	token_bucket: new TokenBucketLimiter(),
	sliding_window: new SlidingWindowLimiter(),
	fixed_window: new FixedWindowLimiter(),
};

/**
 * Check rate limit for a request
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit({
 *   strategy: "sliding_window",
 *   limit: 100,
 *   window: 60, // 100 requests per minute
 *   identifier: request.ip,
 *   namespace: "api"
 * });
 *
 * if (!result.allowed) {
 *   return new Response("Rate limit exceeded", {
 *     status: 429,
 *     headers: {
 *       "X-RateLimit-Limit": result.limit.toString(),
 *       "X-RateLimit-Remaining": "0",
 *       "X-RateLimit-Reset": (Date.now() + result.retryAfter * 1000).toString(),
 *       "Retry-After": result.retryAfter.toString()
 *     }
 *   });
 * }
 * ```
 */
export async function checkRateLimit(
	config: RateLimitConfig
): Promise<RateLimitResult> {
	const redis = getRedisClient();
	const strategy = config.strategy || "sliding_window";
	const limiter = limiters[strategy];

	const span = trace.getActiveSpan();

	if (span) {
		span.setAttribute("rate_limit.strategy", strategy);
		span.setAttribute("rate_limit.limit", config.limit);
		span.setAttribute("rate_limit.window", config.window);
		span.setAttribute(
			"rate_limit.namespace",
			config.namespace || "default"
		);
	}

	try {
		const result = await limiter.checkLimit(redis, config);

		if (span) {
			span.setAttribute("rate_limit.allowed", result.allowed);
			span.setAttribute("rate_limit.remaining", result.remaining);
		}

		if (!result.allowed) {
			logWarn("Rate limit exceeded", {
				identifier: config.identifier,
				namespace: config.namespace,
				limit: config.limit,
				window: config.window,
			});
		}

		return result;
	} catch (error) {
		logError("Rate limit check failed", error);

		// Fail open on error
		return {
			allowed: true,
			remaining: config.limit,
			limit: config.limit,
			resetIn: config.window,
		};
	}
}

/**
 * Rate limit middleware for API routes
 *
 * @example
 * ```typescript
 * // app/api/chat/route.ts
 * export async function POST(request: Request) {
 *   const limiter = createRateLimiter({
 *     limit: 10,
 *     window: 60,
 *     identifier: request.headers.get("x-forwarded-for") || "unknown"
 *   });
 *
 *   const limitResult = await limiter(request);
 *   if (!limitResult.allowed) {
 *     return limitResult.response;
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function createRateLimiter(config: Omit<RateLimitConfig, "identifier">) {
	return async (request: Request) => {
		// Extract identifier from request
		const ip =
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			request.headers.get("x-real-ip") ||
			"unknown";

		const result = await checkRateLimit({
			...config,
			identifier: ip,
		});

		if (!result.allowed) {
			return {
				allowed: false,
				response: new Response(
					JSON.stringify({
						error: config.errorMessage || "Rate limit exceeded",
						limit: result.limit,
						retryAfter: result.retryAfter,
					}),
					{
						status: 429,
						headers: {
							"Content-Type": "application/json",
							"X-RateLimit-Limit": result.limit.toString(),
							"X-RateLimit-Remaining":
								result.remaining.toString(),
							"X-RateLimit-Reset": (
								Date.now() +
								(result.retryAfter || 0) * 1000
							).toString(),
							"Retry-After": (result.retryAfter || 0).toString(),
						},
					}
				),
			};
		}

		return { allowed: true, result };
	};
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
	/** Strict: 10 requests per minute */
	strict: (identifier: string) =>
		checkRateLimit({
			strategy: "sliding_window",
			limit: 10,
			window: 60,
			identifier,
		}),

	/** Standard: 100 requests per minute */
	standard: (identifier: string) =>
		checkRateLimit({
			strategy: "sliding_window",
			limit: 100,
			window: 60,
			identifier,
		}),

	/** Generous: 1000 requests per minute */
	generous: (identifier: string) =>
		checkRateLimit({
			strategy: "sliding_window",
			limit: 1000,
			window: 60,
			identifier,
		}),

	/** Per-user chat: 50 requests per minute */
	chat: (userId: string) =>
		checkRateLimit({
			strategy: "token_bucket",
			limit: 50,
			window: 60,
			identifier: userId,
			namespace: "chat",
		}),

	/** File upload: 5 requests per hour */
	upload: (userId: string) =>
		checkRateLimit({
			strategy: "fixed_window",
			limit: 5,
			window: 3600,
			identifier: userId,
			namespace: "upload",
		}),
};
