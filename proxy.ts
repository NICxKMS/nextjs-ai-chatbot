import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { mintGuestToken, rotateGuestToken, verifyGuestToken } from "@/lib/auth/guest"

// ── Constants ──────────────────────────────────────────────────

/** Prefix used by @supabase/ssr for auth cookies (pattern: sb-<project-ref>-auth-token). */
const SUPABASE_COOKIE_PREFIX = "sb-"

/** Guest token cookie max age: 7 days (in seconds). */
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

// Mobile device detection pattern (covers common mobile user agents)
const MOBILE_UA_PATTERN = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|webos/i

// ── Route Classification ───────────────────────────────────────
// Per auth-system.md §Route Classification Matrix (canonical):
//   public         — skip auth entirely
//   guest-eligible — auto-bootstrap guest if no session
//   auth-required  — redirect to /login if no valid session
//   rate-limit-exempt — bypass edge throttling

/** Public routes: skip auth redirects and skip guest bootstrap. */
const PUBLIC_ROUTES = new Set(["/login", "/register", "/api/health"])

/** Rate-limit-exempt routes: skip edge-level throttling checks. */
const RATE_LIMIT_EXEMPT_PREFIXES = ["/_next/", "/favicon.ico", "/images/", "/api/health"]

type RouteClass = "public" | "guest-eligible" | "auth-required"

/**
 * Classify a pathname into a route category.
 */
function classifyRoute(pathname: string): RouteClass {
	if (PUBLIC_ROUTES.has(pathname)) {
		return "public"
	}

	// Guest-eligible: root, chat routes, API routes (for chat streaming)
	if (
		pathname === "/" ||
		pathname === "/chat" ||
		pathname.startsWith("/chat/") ||
		pathname.startsWith("/api/")
	) {
		return "guest-eligible"
	}

	// All other routes require authentication (future admin routes, etc.)
	return "auth-required"
}

/**
 * Check if a pathname is exempt from rate limiting.
 */
function isRateLimitExempt(pathname: string): boolean {
	return RATE_LIMIT_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

async function hasVerifiedGuestToken(token: string | undefined): Promise<boolean> {
	if (!token) {
		return false
	}

	try {
		return !!(await verifyGuestToken(token))
	} catch {
		return false
	}
}

// ── Guest Token Helpers ────────────────────────────────────────

/** Cookie options for the guest token (browser persistence). */
const GUEST_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax" as const,
	maxAge: GUEST_COOKIE_MAX_AGE,
	path: "/",
}

function forwardRequest(requestHeaders: Headers) {
	return NextResponse.next({
		request: { headers: requestHeaders },
	})
}

function updateForwardedGuestCookie(request: NextRequest, requestHeaders: Headers, token: string) {
	request.cookies.set(GUEST_COOKIE_NAME, token)
	requestHeaders.set("cookie", request.cookies.toString())
}

function forwardRequestWithGuestToken(
	request: NextRequest,
	requestHeaders: Headers,
	token: string,
) {
	updateForwardedGuestCookie(request, requestHeaders, token)

	const response = forwardRequest(requestHeaders)
	response.cookies.set(GUEST_COOKIE_NAME, token, GUEST_COOKIE_OPTIONS)
	return response
}

async function mintGuestTokenResponse(request: NextRequest, requestHeaders: Headers) {
	const guestId = crypto.randomUUID()
	const token = await mintGuestToken(guestId)
	return forwardRequestWithGuestToken(request, requestHeaders, token)
}

/**
 * Next.js 16 proxy interceptor.
 *
 * Handles:
 *  - Device detection (x-device-type header)
 *  - Route classification (public / guest-eligible / auth-required)
 *  - Guest token lifecycle (dual-write pattern: mint, verify, rotate)
 *  - Auth redirect for protected routes
 *  - Rate limiting stub (log-only)
 */
export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Fast-path: skip static assets and rate-limit-exempt paths
	if (isRateLimitExempt(pathname)) {
		return NextResponse.next()
	}

	// --- Clone request headers so downstream route handlers receive mutations ---
	const requestHeaders = new Headers(request.headers)

	// --- Device detection via User-Agent header ---
	const userAgent = request.headers.get("user-agent") ?? ""
	const isMobile = MOBILE_UA_PATTERN.test(userAgent)
	requestHeaders.set("x-device-type", isMobile ? "mobile" : "desktop")

	// ── Route classification ───────────────────────────────────
	const routeClass = classifyRoute(pathname)

	// Public routes: skip all auth handling
	if (routeClass === "public") {
		return forwardRequest(requestHeaders)
	}

	// ── Session detection ──────────────────────────────────────
	const hasSupabaseToken = request.cookies
		.getAll()
		.some((c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX))
	const guestTokenCookie = request.cookies.get(GUEST_COOKIE_NAME)
	const guestToken = guestTokenCookie?.value

	// ── Auth-required routes: redirect if no valid session ─────
	if (routeClass === "auth-required") {
		const hasValidGuestToken = await hasVerifiedGuestToken(guestToken)

		if (!hasSupabaseToken && !hasValidGuestToken) {
			const loginUrl = new URL("/login", request.url)
			return NextResponse.redirect(loginUrl)
		}
	}

	// ── Guest-eligible routes: guest token lifecycle ───────────
	if (routeClass === "guest-eligible" && !hasSupabaseToken) {
		try {
			// No session at all → mint a new guest token (dual-write)
			if (!guestToken) {
				return mintGuestTokenResponse(request, requestHeaders)
			}

			// Existing guest token → verify, rotate if near expiry
			const verified = await verifyGuestToken(guestToken)
			if (verified) {
				const rotated = await rotateGuestToken(guestToken)

				// Token was rotated (different from original) → dual-write the new token
				if (rotated !== guestToken) {
					return forwardRequestWithGuestToken(request, requestHeaders, rotated)
				}
			} else {
				// Guest token is invalid/expired → mint a fresh one with new identity
				return mintGuestTokenResponse(request, requestHeaders)
			}
		} catch (error) {
			// Guest token operations can fail if GUEST_JWT_SECRET is missing.
			// Continue without guest token — degraded experience is better than crash.
			console.error("[proxy] Guest token lifecycle error:", error)
		}
	}

	// ── Rate limiting ──────────────────────────────────────────
	// Auth rate limiting is handled inline in login/register actions (Redis incr/expire).
	// API route rate limiting can be added here when needed.

	// --- Forward mutated request headers to downstream route handlers ---
	return forwardRequest(requestHeaders)
}

export const config = {
	matcher: [
		/*
		 * Match all paths except static assets and metadata files.
		 * Excludes: _next/static, _next/image, favicon.ico, images/
		 */
		"/((?!_next/static|_next/image|favicon.ico|images/).*)",
	],
}
