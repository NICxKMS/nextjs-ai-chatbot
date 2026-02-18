/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting middleware wrapping lib/rate-limit for API route integration.
 * Pre-configured rate limiters for common use cases.
 *
 * @module lib/middleware/rate-limit
 */

import { type NextRequest, NextResponse } from "next/server"

import {
	chatLimiter,
	createRateLimitHeaders,
	getRetryAfter,
	type RateLimiter,
	type RateLimitResult,
} from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Rate limit middleware result with headers.
 */
export interface RateLimitMiddlewareResult {
	/** Whether the request is allowed */
	success: boolean
	/** Number of requests remaining */
	remaining: number
	/** Unix timestamp (ms) when the rate limit resets */
	reset: number
}

// =============================================================================
// Rate Limit Middleware Factory
// =============================================================================

/**
 * Create a rate limiting middleware with the specified limiter.
 *
 * Wraps an API route handler and enforces rate limiting before allowing access.
 * Returns 429 Too Many Requests if rate limit is exceeded.
 *
 * @param limiter - The rate limiter instance to use
 * @param keyExtractor - Function to extract rate limit key from request (defaults to IP)
 * @returns Middleware function that enforces rate limiting
 *
 * @example
 * ```typescript
 * // Using pre-configured limiter
 * export const POST = withRateLimitMiddleware(chatLimiter)(async (req) => {
 *   // Rate limit passed, process request
 *   return NextResponse.json({ success: true });
 * });
 *
 * // With custom key extractor
 * export const POST = withRateLimitMiddleware(
 *   chatLimiter,
 *   (req) => req.headers.get('x-user-id') || 'anonymous'
 * )(async (req) => {
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withRateLimitMiddleware(
	limiter: RateLimiter,
	keyExtractor?: (req: NextRequest) => string | Promise<string>,
): (
	handler: (req: NextRequest) => Promise<NextResponse>,
) => (req: NextRequest) => Promise<NextResponse> {
	return (
		handler: (req: NextRequest) => Promise<NextResponse>,
	): ((req: NextRequest) => Promise<NextResponse>) => {
		return async (req: NextRequest): Promise<NextResponse> => {
			// Extract key for rate limiting
			const key = keyExtractor
				? await keyExtractor(req)
				: getDefaultRateLimitKey(req)

			// Check rate limit
			const result = await limiter.consumeToken(key)

			// If rate limit exceeded, return 429
			if (!result.success) {
				const retryAfter = getRetryAfter(result.reset)
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "RATE_LIMIT_EXCEEDED",
							message:
								"Too many requests. Please try again later.",
							details: { retryAfter },
						},
					},
					{
						status: 429,
						headers: {
							"Retry-After": String(retryAfter),
							"X-RateLimit-Limit": String(result.limit),
							"X-RateLimit-Remaining": String(result.remaining),
							"X-RateLimit-Reset": String(result.reset),
						},
					},
				)
			}

			// Rate limit passed, proceed with handler
			const response = await handler(req)

			// Add rate limit headers to response
			response.headers.set("X-RateLimit-Limit", String(result.limit))
			response.headers.set(
				"X-RateLimit-Remaining",
				String(result.remaining),
			)
			response.headers.set("X-RateLimit-Reset", String(result.reset))

			return response
		}
	}
}

// =============================================================================
// Pre-configured Rate Limiters
// =============================================================================

/**
 * Rate limit middleware for chat/AI endpoints.
 * 60 requests per minute.
 */
export const chatRateLimit = withRateLimitMiddleware(chatLimiter)

/**
 * Rate limit middleware for authentication endpoints.
 * 10 requests per minute with fail-closed mode.
 */
// Note: authLimiter is configured with failClosed: true for security

/**
 * Rate limit middleware for file upload endpoints.
 * 20 requests per minute.
 */
// export const uploadRateLimit = withRateLimitMiddleware(uploadLimiter)

/**
 * Rate limit middleware for general API endpoints.
 * 100 requests per minute.
 */
// export const apiRateLimit = withRateLimitMiddleware(apiLimiter)

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Default number of trusted proxies for IP extraction.
 * Vercel/Cloudflare typically adds 1 proxy.
 */
const DEFAULT_TRUSTED_PROXY_COUNT = 1

/**
 * Get default rate limit key from request securely.
 * Uses client IP address as the key with protection against header spoofing.
 *
 * SECURITY: This function implements secure IP extraction by:
 * 1. Prioritizing Cloudflare's CF-Connecting-IP header
 * 2. Handling X-Forwarded-For chain with trusted proxy count
 * 3. Supporting Vercel-specific headers
 *
 * This prevents header spoofing attacks where attackers attempt to
 * bypass rate limits by manipulating X-Forwarded-For headers.
 *
 * @param req - The incoming request
 * @returns Rate limit key (IP address or 'unknown')
 */
function getDefaultRateLimitKey(req: NextRequest): string {
	// 1. Cloudflare provides the most reliable client IP
	const cfIP = req.headers.get("cf-connecting-ip")
	if (cfIP) {
		return cfIP.trim()
	}

	// 2. Vercel-specific header with chain handling
	const vercelForwarded = req.headers.get("x-vercel-forwarded-for")
	if (vercelForwarded) {
		const ips = vercelForwarded.split(",").map((ip) => ip.trim())
		// Client IP is at position: length - 1 - trustedProxyCount
		const clientIndex = Math.max(
			0,
			ips.length - 1 - DEFAULT_TRUSTED_PROXY_COUNT,
		)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// 3. Standard X-Forwarded-For with chain handling
	const forwardedFor = req.headers.get("x-forwarded-for")
	if (forwardedFor) {
		const ips = forwardedFor.split(",").map((ip) => ip.trim())
		// Client IP is at position: length - 1 - trustedProxyCount
		const clientIndex = Math.max(
			0,
			ips.length - 1 - DEFAULT_TRUSTED_PROXY_COUNT,
		)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// 4. Fallback to X-Real-IP (single IP, no chain)
	const realIP = req.headers.get("x-real-ip")
	if (realIP) {
		return realIP.trim()
	}

	return "unknown"
}

/**
 * Get rate limit headers from a rate limit result.
 * Useful for adding rate limit info to responses.
 *
 * @param result - Rate limit result
 * @returns Headers object with rate limit info
 */
export function getRateLimitHeaders(result: RateLimitResult): Headers {
	return createRateLimitHeaders(result)
}
