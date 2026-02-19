/**
 * Rate Limiting Module
 *
 * Provides distributed rate limiting using Redis with sliding window algorithm.
 * Designed for serverless environments using Upstash Redis.
 *
 * @module lib/rate-limit
 *
 * @example
 * ```typescript
 * import { chatLimiter, checkChatLimit } from '@/lib/rate-limit';
 *
 * // Using pre-configured limiter
 * const result = await checkChatLimit('user:123');
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 *
 * // Using custom limiter
 * import { createRateLimiter } from '@/lib/rate-limit';
 * const limiter = createRateLimiter({ limit: 100, window: 60 });
 * const result = await limiter.consumeToken('key');
 * ```
 */

// =============================================================================
// Rate Limiter Class and Factory
// =============================================================================

export {
	createRateLimiter,
	createRateLimitHeaders,
	getClientIP,
	getRetryAfter,
	isRateLimitAvailable,
	type RateLimitConfig,
	RateLimiter,
	type RateLimitOptions,
	type RateLimitResult,
} from "./rate-limiter"

// =============================================================================
// Predefined Rate Limiters
// =============================================================================

export {
	apiLimiter,
	authGuestLimiter,
	authLimiter,
	chatLimiter,
	checkApiLimit,
	checkAuthGuestLimit,
	checkAuthLimit,
	checkChatLimit,
	checkGenerousLimit,
	checkGuestLimit,
	checkStandardLimit,
	checkStreamLimit,
	checkStrictLimit,
	checkUploadLimit,
	generousLimiter,
	getRateLimiter,
	guestLimiter,
	type RateLimiterName,
	rateLimiters,
	standardLimiter,
	streamLimiter,
	strictLimiter,
	uploadLimiter,
} from "./limits"
