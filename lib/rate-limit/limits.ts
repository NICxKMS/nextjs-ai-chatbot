/**
 * Predefined Rate Limit Configurations
 *
 * Provides pre-configured rate limiters for common use cases.
 * Uses centralized constants from lib/constants.ts for consistency.
 *
 * @module lib/rate-limit/limits
 */

import { RATE_LIMITS } from "@/lib/constants"
import { createRateLimiter, type RateLimiter } from "./rate-limiter"

// =============================================================================
// Predefined Rate Limiter Instances
// =============================================================================

/**
 * Chat rate limiter - for AI chat completions.
 * 60 requests per minute.
 *
 * Uses sliding window for smooth rate limiting.
 */
export const chatLimiter: RateLimiter = createRateLimiter({
	limit: RATE_LIMITS.chat.requests,
	window: RATE_LIMITS.chat.window,
	prefix: "ratelimit:chat",
})

/**
 * Authentication rate limiter - for auth endpoints.
 * 10 requests per minute.
 *
 * Stricter limits to prevent brute force attacks.
 * Uses fail-closed mode for security.
 */
export const authLimiter: RateLimiter = createRateLimiter(
	{
		limit: RATE_LIMITS.auth.requests,
		window: RATE_LIMITS.auth.window,
		prefix: "ratelimit:auth",
	},
	{ failClosed: true }, // Fail closed for auth endpoints
)

/**
 * Upload rate limiter - for file uploads.
 * 20 requests per minute.
 *
 * Moderate limits to prevent abuse while allowing legitimate uploads.
 */
export const uploadLimiter: RateLimiter = createRateLimiter({
	limit: RATE_LIMITS.upload.requests,
	window: RATE_LIMITS.upload.window,
	prefix: "ratelimit:upload",
})

/**
 * General API rate limiter - for standard API endpoints.
 * 100 requests per minute.
 *
 * Suitable for read operations and general API access.
 */
export const apiLimiter: RateLimiter = createRateLimiter({
	limit: RATE_LIMITS.api.requests,
	window: RATE_LIMITS.api.window,
	prefix: "ratelimit:api",
})

// =============================================================================
// Rate Limiter Registry
// =============================================================================

/**
 * Registry of all predefined rate limiters.
 * Use this to look up limiters by name.
 */
export const rateLimiters = {
	chat: chatLimiter,
	auth: authLimiter,
	upload: uploadLimiter,
	api: apiLimiter,
} as const

/**
 * Type for rate limiter names.
 */
export type RateLimiterName = keyof typeof rateLimiters

/**
 * Get a rate limiter by name.
 *
 * @param name - The name of the rate limiter
 * @returns The rate limiter instance
 * @throws Error if the limiter name is not found
 *
 * @example
 * ```typescript
 * const limiter = getRateLimiter('chat');
 * const result = await limiter.consumeToken('user:123');
 * ```
 */
export function getRateLimiter(name: RateLimiterName): RateLimiter {
	return rateLimiters[name]
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check chat rate limit for a user.
 *
 * @param userId - User identifier
 * @returns Rate limit result
 */
export async function checkChatLimit(userId: string) {
	return chatLimiter.consumeToken(userId)
}

/**
 * Check auth rate limit for an identifier (e.g., IP address).
 *
 * @param identifier - Identifier to rate limit
 * @returns Rate limit result
 */
export async function checkAuthLimit(identifier: string) {
	return authLimiter.consumeToken(identifier)
}

/**
 * Check upload rate limit for a user.
 *
 * @param userId - User identifier
 * @returns Rate limit result
 */
export async function checkUploadLimit(userId: string) {
	return uploadLimiter.consumeToken(userId)
}

/**
 * Check API rate limit for an identifier.
 *
 * @param identifier - Identifier to rate limit
 * @returns Rate limit result
 */
export async function checkApiLimit(identifier: string) {
	return apiLimiter.consumeToken(identifier)
}
