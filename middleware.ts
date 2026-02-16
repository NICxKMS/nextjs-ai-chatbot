/**
 * Edge Middleware
 *
 * Next.js Edge Middleware for authentication, rate limiting, and request preprocessing.
 * Runs on Edge runtime for optimal performance.
 *
 * @module middleware
 */

import { type NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import {
	apiLimiter,
	authLimiter,
	chatLimiter,
	uploadLimiter,
} from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Rate limit result from edge rate limiting
 */
interface EdgeRateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean
	/** Number of requests remaining */
	remaining: number
	/** Maximum requests allowed */
	limit: number
	/** Seconds until rate limit resets (undefined if allowed) */
	retryAfter: number | undefined
}

// =============================================================================
// Middleware Configuration
// =============================================================================

/**
 * Middleware matcher configuration.
 * Matches all paths except static files and internal Next.js paths.
 */
export const config = {
	matcher: [
		// Match all paths except static files and _next
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
}

// =============================================================================
// Main Middleware Function
// =============================================================================

/**
 * Main middleware function for authentication, rate limiting, and routing.
 *
 * @param request - The incoming request
 * @returns Response (next, redirect, or error)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
	const { pathname } = request.nextUrl

	// 1. Skip middleware for auth callback routes (NextAuth handles these)
	if (isAuthCallbackRoute(pathname)) {
		return NextResponse.next()
	}

	// 2. Skip middleware for health endpoints (monitoring needs unblocked access)
	if (isHealthRoute(pathname)) {
		return NextResponse.next()
	}

	// 3. Get session and user context
	const session = await auth()
	const isAuthenticated = !!session?.user
	const userId = session?.user?.id ?? getGuestId(request)

	// 4. Apply rate limiting for API routes
	if (pathname.startsWith("/api/")) {
		const rateLimitResult = await applyRateLimit(pathname, userId)

		if (!rateLimitResult.allowed) {
			return createRateLimitResponse(rateLimitResult)
		}

		// Continue with rate limit headers
		const response = NextResponse.next()
		setRateLimitHeaders(response, rateLimitResult)
		setUserContextHeaders(response, userId, isAuthenticated)
		return response
	}

	// 5. Protected routes check (chat pages require authentication)
	if (isProtectedPageRoute(pathname) && !isAuthenticated) {
		const loginUrl = new URL("/login", request.url)
		loginUrl.searchParams.set("callbackUrl", pathname)
		return NextResponse.redirect(loginUrl)
	}

	// 6. Auth routes redirect if already logged in
	if (isAuthPageRoute(pathname) && isAuthenticated) {
		return NextResponse.redirect(new URL("/", request.url))
	}

	// 7. Add user context headers for downstream use
	const response = NextResponse.next()
	setUserContextHeaders(response, userId, isAuthenticated)
	return response
}

// =============================================================================
// Route Classification Helpers
// =============================================================================

/**
 * Check if the path is an auth callback route.
 * These are handled by NextAuth and should bypass middleware.
 */
function isAuthCallbackRoute(pathname: string): boolean {
	return pathname.startsWith("/api/auth/")
}

/**
 * Check if the path is a health endpoint.
 * Health checks need unblocked access for monitoring.
 */
function isHealthRoute(pathname: string): boolean {
	return pathname === "/api/health"
}

/**
 * Check if the path is a protected page route.
 * These pages require authentication.
 */
function isProtectedPageRoute(pathname: string): boolean {
	const protectedPaths = ["/chat/"]
	return protectedPaths.some((path) => pathname.startsWith(path))
}

/**
 * Check if the path is an auth page route.
 * Logged-in users should be redirected away from these.
 */
function isAuthPageRoute(pathname: string): boolean {
	const authPaths = ["/login", "/register"]
	return authPaths.includes(pathname)
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Apply rate limiting based on route type.
 * Uses route-specific limiters for different endpoint types.
 *
 * @param pathname - The request pathname
 * @param identifier - User identifier for rate limiting
 * @returns Rate limit result
 */
async function applyRateLimit(
	pathname: string,
	identifier: string,
): Promise<EdgeRateLimitResult> {
	// Select appropriate limiter based on route
	const limiter = getLimiterForRoute(pathname)

	// Check rate limit
	const result = await limiter.consumeToken(identifier)

	return {
		allowed: result.success,
		remaining: result.remaining,
		limit: result.limit,
		retryAfter: result.success
			? undefined
			: Math.ceil((result.reset - Date.now()) / 1000),
	}
}

/**
 * Get the appropriate rate limiter for a route.
 */
function getLimiterForRoute(pathname: string) {
	// Chat endpoints - highest limit
	if (
		pathname.startsWith("/api/chat") ||
		pathname.startsWith("/api/suggestions")
	) {
		return chatLimiter
	}

	// Auth endpoints - strictest limit
	if (
		pathname.startsWith("/api/auth/guest") ||
		pathname.startsWith("/api/auth/logout")
	) {
		return authLimiter
	}

	// Upload endpoints - moderate limit
	if (pathname.startsWith("/api/files/upload")) {
		return uploadLimiter
	}

	// Default API limiter for all other routes
	return apiLimiter
}

/**
 * Create a rate limit exceeded response.
 */
function createRateLimitResponse(result: EdgeRateLimitResult): NextResponse {
	return NextResponse.json(
		{
			success: false,
			error: {
				code: "RATE_LIMIT_EXCEEDED",
				message: "Too many requests. Please try again later.",
				details: {
					retryAfter: result.retryAfter,
					limit: result.limit,
				},
			},
		},
		{
			status: 429,
			headers: {
				"Retry-After": String(result.retryAfter ?? 60),
				"X-RateLimit-Limit": String(result.limit),
				"X-RateLimit-Remaining": String(result.remaining),
				"X-RateLimit-Reset": String(
					Math.floor(Date.now() / 1000) + (result.retryAfter ?? 60),
				),
			},
		},
	)
}

/**
 * Set rate limit headers on response.
 */
function setRateLimitHeaders(
	response: NextResponse,
	result: EdgeRateLimitResult,
): void {
	response.headers.set("X-RateLimit-Limit", String(result.limit))
	response.headers.set("X-RateLimit-Remaining", String(result.remaining))
	response.headers.set(
		"X-RateLimit-Reset",
		String(Math.floor(Date.now() / 1000) + 60),
	)
}

// =============================================================================
// User Context Helpers
// =============================================================================

/**
 * Set user context headers for downstream use.
 * These headers can be used by API routes for user identification.
 */
function setUserContextHeaders(
	response: NextResponse,
	userId: string,
	isAuthenticated: boolean,
): void {
	response.headers.set("x-user-id", userId)
	response.headers.set("x-is-authenticated", String(isAuthenticated))
}

/**
 * Get or generate guest ID from request cookies.
 * Used for rate limiting unauthenticated users.
 */
function getGuestId(request: NextRequest): string {
	const guestId = request.cookies.get("guest_id")?.value
	if (guestId) {
		return guestId
	}
	// Generate a new guest ID using crypto.randomUUID (Edge-compatible)
	return `guest:${crypto.randomUUID()}`
}
