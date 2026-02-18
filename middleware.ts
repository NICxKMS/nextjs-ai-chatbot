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
	authGuestLimiter,
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
		// SECURITY: Use IP-based rate limiting for auth routes to prevent bypass
		// Auth routes should be rate limited by IP, not user ID, to prevent
		// attackers from bypassing limits by creating multiple accounts
		const rateLimitKey = isAuthRateLimitRoute(pathname)
			? getSecureClientIP(request)
			: userId

		const rateLimitResult = await applyRateLimit(pathname, rateLimitKey)

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
 * Check if the path is an auth callback route that should bypass middleware.
 *
 * SECURITY: Only NextAuth callback routes bypass middleware.
 * Guest and logout routes must go through rate limiting.
 *
 * NextAuth routes that should bypass:
 * - /api/auth/callback/* (OAuth callbacks)
 * - /api/auth/signin/* (NextAuth signin pages)
 * - /api/auth/signout (NextAuth signout)
 * - /api/auth/session (NextAuth session check)
 * - /api/auth/csrf (NextAuth CSRF token)
 * - /api/auth/providers (NextAuth providers list)
 *
 * Routes that MUST go through rate limiting:
 * - /api/auth/guest (guest session creation - brute force target)
 * - /api/auth/logout (logout - potential DoS target)
 */
function isAuthCallbackRoute(pathname: string): boolean {
	// NextAuth internal routes that bypass middleware
	const nextAuthInternalRoutes = [
		"/api/auth/callback",
		"/api/auth/signin",
		"/api/auth/signout",
		"/api/auth/session",
		"/api/auth/csrf",
		"/api/auth/providers",
		"/api/auth/_log", // NextAuth internal logging
	]

	return nextAuthInternalRoutes.some((route) => pathname.startsWith(route))
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

/**
 * Check if the path requires IP-based rate limiting.
 *
 * SECURITY: Auth routes must use IP-based rate limiting to prevent
 * attackers from bypassing limits by creating multiple accounts
 * or manipulating session cookies.
 *
 * @param pathname - The request pathname
 * @returns true if the route requires IP-based rate limiting
 */
function isAuthRateLimitRoute(pathname: string): boolean {
	const ipRateLimitedRoutes = [
		"/api/auth/guest", // Guest session creation - brute force target
		"/api/auth/logout", // Logout - potential DoS target
	]
	return ipRateLimitedRoutes.some((route) => pathname.startsWith(route))
}

/**
 * Securely extract client IP from request headers.
 *
 * SECURITY: This function implements secure IP extraction by:
 * 1. Prioritizing Cloudflare's CF-Connecting-IP header
 * 2. Handling X-Forwarded-For chain with trusted proxy count
 * 3. Supporting Vercel-specific headers
 *
 * This prevents header spoofing attacks where attackers attempt to
 * bypass rate limits by manipulating X-Forwarded-For headers.
 *
 * @param request - The incoming request
 * @returns Client IP address or 'unknown'
 */
function getSecureClientIP(request: NextRequest): string {
	// Default trusted proxy count (Vercel/Cloudflare typically adds 1)
	const trustedProxyCount = 1

	// 1. Cloudflare provides the most reliable client IP
	const cfIP = request.headers.get("cf-connecting-ip")
	if (cfIP) {
		return cfIP.trim()
	}

	// 2. Vercel-specific header with chain handling
	const vercelForwarded = request.headers.get("x-vercel-forwarded-for")
	if (vercelForwarded) {
		const ips = vercelForwarded.split(",").map((ip) => ip.trim())
		// Client IP is at position: length - 1 - trustedProxyCount
		const clientIndex = Math.max(0, ips.length - 1 - trustedProxyCount)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// 3. Standard X-Forwarded-For with chain handling
	const forwardedFor = request.headers.get("x-forwarded-for")
	if (forwardedFor) {
		const ips = forwardedFor.split(",").map((ip) => ip.trim())
		// Client IP is at position: length - 1 - trustedProxyCount
		const clientIndex = Math.max(0, ips.length - 1 - trustedProxyCount)
		const clientIP = ips[clientIndex]
		if (clientIP) {
			return clientIP
		}
	}

	// 4. Fallback to X-Real-IP (single IP, no chain)
	const realIP = request.headers.get("x-real-ip")
	if (realIP) {
		return realIP.trim()
	}

	return "unknown"
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

	// Guest session creation - moderate limit (20 req/min)
	// SECURITY: Guest session creation is a high-value target for abuse
	// (spam, resource exhaustion) so it has dedicated rate limiting
	// Uses authGuestLimiter with 20 req/min (moderately strict)
	if (pathname.startsWith("/api/auth/guest")) {
		return authGuestLimiter
	}

	// Auth endpoints (logout) - strict limit
	if (pathname.startsWith("/api/auth/logout")) {
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
