import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { GUEST_COOKIE_NAME, GUEST_TOKEN_TTL_SECONDS } from "@/lib/auth/constants"
import { mintGuestToken, rotateGuestToken, verifyGuestToken } from "@/lib/auth/guest"
import { logger } from "@/lib/utils/logger"

// ── Constants ──────────────────────────────────────────────────

/**
 * Mobile device User-Agent pattern for `x-device-type` header.
 * Covers major mobile platforms; intentionally broad to minimise CLS
 * (the client `useIsMobile` hook corrects on hydration if needed).
 */
const MOBILE_UA_PATTERN = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i

/**
 * Optional exact auth-cookie override.
 * Falls back to the @supabase/ssr default pattern: sb-<project-ref>-auth-token
 */
const SUPABASE_AUTH_COOKIE_NAME_OVERRIDE =
	process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME?.trim() || null

/**
 * Guest token cookie max age — aligned with JWT TTL.
 *
 * The cookie is the browser-side container for the guest JWT. Its maxAge should
 * match the JWT lifetime so the cookie self-cleans when the token expires.
 * Every successful rotation refreshes this maxAge, so active users always
 * have a valid cookie. Inactive users' cookies expire alongside the JWT.
 */
const GUEST_COOKIE_MAX_AGE = GUEST_TOKEN_TTL_SECONDS

// ── Route Classification ───────────────────────────────────────
// Per auth-system.md §Route Classification Matrix (canonical):
//   public         — skip auth entirely
//   guest-eligible — auto-bootstrap guest if no session
//   auth-required  — redirect to /login if no valid session
//   rate-limit-exempt — bypass edge throttling

/** Public routes: skip auth redirects and skip guest bootstrap. */
const PUBLIC_ROUTES = new Set(["/login", "/register", "/api/health"])

/** Guest-eligible exact routes: allow guest bootstrap without auth redirect. */
const GUEST_ELIGIBLE_ROUTES = new Set(["/", "/api/chat"])

/** Guest-eligible prefixes: allow guest bootstrap without auth redirect. */
const GUEST_ELIGIBLE_PREFIXES = ["/chat/"]

/** Rate-limit-exempt routes: skip edge-level throttling checks. */
const RATE_LIMIT_EXEMPT_PREFIXES = ["/_next/", "/favicon.ico", "/images/", "/api/health"]

type RouteClass = "public" | "guest-eligible" | "auth-required"

function getSupabaseAuthCookieBaseName(): string | null {
	if (SUPABASE_AUTH_COOKIE_NAME_OVERRIDE) {
		return SUPABASE_AUTH_COOKIE_NAME_OVERRIDE
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	if (!supabaseUrl) {
		return null
	}

	try {
		const hostname = new URL(supabaseUrl).hostname
		const projectRef = hostname.split(".")[0]

		if (!projectRef) {
			return null
		}

		return `sb-${projectRef}-auth-token`
	} catch {
		return null
	}
}

function isSupabaseAuthCookieName(name: string): boolean {
	const baseName = getSupabaseAuthCookieBaseName()
	if (!baseName) {
		return false
	}

	return name === baseName || name.startsWith(`${baseName}.`)
}

/**
 * Classify a pathname into a route category.
 */
function classifyRoute(pathname: string): RouteClass {
	if (PUBLIC_ROUTES.has(pathname)) {
		return "public"
	}

	if (GUEST_ELIGIBLE_ROUTES.has(pathname)) {
		return "guest-eligible"
	}

	if (GUEST_ELIGIBLE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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
	requestHeaders.set("x-session-type", "guest")
	return forwardRequestWithGuestToken(request, requestHeaders, token)
}

/**
 * Next.js 16 proxy interceptor.
 *
 * Handles:
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

	// ── Strip internal headers that must only be set by the proxy ──
	// These headers control session resolution in getAppSession(). If not
	// stripped, a client can spoof them on routes that match the proxy, or
	// exploit the catch-block fallthrough. Defense-in-depth: session.ts
	// also validates independently, but the proxy is the first line.
	requestHeaders.delete("x-session-type")

	// ── Device detection ──────────────────────────────────────────
	// Parse User-Agent and set x-device-type so server components can read it
	// via headers() and pass initialIsMobile to useIsMobile, avoiding CLS.
	const userAgent = request.headers.get("user-agent") ?? ""
	requestHeaders.set("x-device-type", MOBILE_UA_PATTERN.test(userAgent) ? "mobile" : "desktop")

	// ── Route classification ───────────────────────────────────
	const routeClass = classifyRoute(pathname)

	// Public routes: skip auth lifecycle but hint session type for downstream optimization.
	// The auth layout reads x-session-type to avoid a wasted Supabase getUser() call
	// for unauthenticated visitors on /login and /register.
	if (routeClass === "public") {
		const hasAuthCookie = request.cookies
			.getAll()
			.some((cookie) => isSupabaseAuthCookieName(cookie.name))
		if (!hasAuthCookie) {
			requestHeaders.set("x-session-type", "none")
		}
		return forwardRequest(requestHeaders)
	}

	// ── Session detection ──────────────────────────────────────
	const cookies = request.cookies
	const hasSupabaseToken = cookies
		.getAll()
		.some((cookie) => isSupabaseAuthCookieName(cookie.name))
	const guestToken = cookies.get(GUEST_COOKIE_NAME)?.value

	// Hint downstream session resolver to skip unnecessary Supabase round-trips
	if (hasSupabaseToken) {
		requestHeaders.set("x-session-type", "authenticated")
	}

	// ── Auth-required routes: redirect if no valid session ─────
	if (routeClass === "auth-required") {
		if (!hasSupabaseToken) {
			const verified = guestToken ? await verifyGuestToken(guestToken) : null

			if (!verified) {
				const loginUrl = new URL("/login", request.url)
				return NextResponse.redirect(loginUrl)
			}

			requestHeaders.set("x-session-type", "guest")
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
				requestHeaders.set("x-session-type", "guest")

				const rotated = await rotateGuestToken(guestToken, verified)

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
			// Ensure internal headers are clean so downstream doesn't see stale/partial state.
			requestHeaders.set("x-session-type", "none")
			logger.error("[proxy] Guest token lifecycle error", { error: String(error) })
		}
	}

	// ── Rate limiting ──────────────────────────────────────────
	// Auth rate limiting is handled inline in login/register actions (Redis incr/expire).
	// API route rate limiting can be added here when needed.

	// --- Forward mutated request headers to downstream route handlers ---
	return forwardRequest(requestHeaders)
}

export const config = {
	matcher: ["/", "/chat/:path*", "/login", "/register", "/api/:path*"],
}
