/**
 * Guest Session API Route
 *
 * Creates or retrieves a guest session for unauthenticated users.
 * Enables chat functionality without requiring authentication.
 *
 * Security:
 * - CSRF protection via Origin/Referer header validation
 * - Open redirect protection via URL validation
 * - Rate limiting via middleware (5 requests/minute per IP)
 * - Route-level rate limiting for defense-in-depth
 *
 * @module app/api/auth/guest
 */

import { NextResponse } from "next/server"
import { forbidden, getClientIp, validateOrigin } from "@/lib/api"
import { getOrCreateGuestSession, getSession } from "@/lib/auth"
import { logInfo, logWarn } from "@/lib/log"
import { checkGuestLimit } from "@/lib/rate-limit"
import { getSafeRedirectUrl } from "@/lib/utils"

// Optimize for Vercel Fluid Compute
export const maxDuration = 10

/**
 * Create a JSON response with rate limit headers.
 */
function createResponseWithRateHeaders(
	data: unknown,
	status: number,
	rateLimitResult: { limit: number; remaining: number; reset: number },
): NextResponse {
	const response = NextResponse.json({ success: true, data }, { status })
	response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit))
	response.headers.set(
		"X-RateLimit-Remaining",
		String(rateLimitResult.remaining),
	)
	response.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset))
	return response
}

/**
 * Create a rate limit exceeded response with proper headers.
 */
function createRateLimitResponse(
	retryAfter: number,
	limit: number,
	remaining: number,
): NextResponse {
	const response = NextResponse.json(
		{
			success: false,
			error: {
				code: "RATE_LIMIT_EXCEEDED",
				message: "Too many requests. Please try again later.",
				details: { retryAfter },
			},
		},
		{ status: 429 },
	)
	response.headers.set("Retry-After", String(retryAfter))
	response.headers.set("X-RateLimit-Limit", String(limit))
	response.headers.set("X-RateLimit-Remaining", String(remaining))
	response.headers.set(
		"X-RateLimit-Reset",
		String(Math.floor(Date.now() / 1000) + retryAfter),
	)
	return response
}

/**
 * POST /api/auth/guest
 * Creates a new guest session or returns existing session.
 *
 * Security:
 * - Validates Origin/Referer headers to prevent CSRF attacks.
 * - Rate limited to 5 requests per minute per IP address.
 * - Cross-origin requests are rejected with 403 Forbidden.
 */
export async function POST(request: Request) {
	// CSRF Protection: Validate Origin/Referer headers
	// This prevents malicious sites from creating guest sessions on behalf of users
	if (!validateOrigin(request)) {
		return forbidden("Invalid request origin")
	}

	// Route-level rate limiting (defense-in-depth)
	// Middleware already enforces rate limiting, but this provides an additional layer
	// of protection in case middleware is bypassed or misconfigured
	const clientIp = getClientIp(request)
	const rateLimitResult = await checkGuestLimit(clientIp)

	if (!rateLimitResult.success) {
		const retryAfter = Math.ceil(
			(rateLimitResult.reset - Date.now()) / 1000,
		)
		logWarn("Guest POST: rate limit exceeded", {
			clientIp,
			retryAfter,
		})
		return createRateLimitResponse(
			retryAfter,
			rateLimitResult.limit,
			rateLimitResult.remaining,
		)
	}

	// Check for existing session (auth or guest)
	const session = await getSession()

	if (session) {
		// Log truncated user ID for privacy (first 8 chars after any prefix)
		const userIdPrefix = session.user.id
			.replace(/^(guest:|user:)/, "")
			.slice(0, 8)
		logInfo("Guest POST: returning existing session", {
			userIdPrefix,
			isGuest: session.user.id.startsWith("guest:"),
		})
		return createResponseWithRateHeaders(
			{ user: session.user, isNewSession: false },
			200,
			rateLimitResult,
		)
	}

	// Create new guest session
	const guestSession = await getOrCreateGuestSession()

	// Log truncated guest ID for privacy (first 8 chars after "guest:" prefix)
	const guestIdPrefix = guestSession.user.id.replace("guest:", "").slice(0, 8)
	logInfo("Guest POST: session created", { guestIdPrefix })

	return createResponseWithRateHeaders(
		{ user: guestSession.user, isNewSession: true },
		200,
		rateLimitResult,
	)
}

/**
 * GET /api/auth/guest
 * Server-side guest session creation with redirect support.
 *
 * Security: Validates redirectUrl to prevent open redirect attacks.
 * Only relative URLs starting with '/' are allowed.
 */
export async function GET(request: Request) {
	const url = new URL(request.url)
	const redirectUrl = url.searchParams.get("redirectUrl") || "/"

	// Open Redirect Protection: Validate the redirect URL
	// Only allow relative paths starting with '/' or same-origin absolute URLs
	const safeRedirectUrl = getSafeRedirectUrl(redirectUrl, url.origin)

	// Check for existing session
	const session = await getSession()
	if (session) {
		// Log truncated user ID for privacy
		const userIdPrefix = session.user.id
			.replace(/^(guest:|user:)/, "")
			.slice(0, 8)
		logInfo("Guest GET: session exists, redirecting", {
			userIdPrefix,
			redirectUrl: safeRedirectUrl,
		})
		return NextResponse.redirect(new URL(safeRedirectUrl, url.origin))
	}

	// Create guest session and redirect
	const guestSession = await getOrCreateGuestSession()

	// Log truncated guest ID for privacy
	const guestIdPrefix = guestSession.user.id.replace("guest:", "").slice(0, 8)
	logInfo("Guest GET: session created, redirecting", {
		guestIdPrefix,
		redirectUrl: safeRedirectUrl,
	})

	return NextResponse.redirect(new URL(safeRedirectUrl, url.origin))
}
