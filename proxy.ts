import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Mobile device detection pattern (covers common mobile user agents)
const MOBILE_UA_PATTERN = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|webos/i

/**
 * Next.js 16 proxy interceptor.
 *
 * Phase 0 scope:
 *  - Device detection (x-device-type header)
 *  - Commented placeholders for auth, guest tokens, rate limiting (P2-T08)
 */
export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Fast-path: skip health-check endpoint
	if (pathname === "/api/health") {
		return NextResponse.next()
	}

	// --- Clone request headers so downstream route handlers receive mutations ---
	const requestHeaders = new Headers(request.headers)

	// --- Device detection via User-Agent header ---
	const userAgent = request.headers.get("user-agent") ?? ""
	const isMobile = MOBILE_UA_PATTERN.test(userAgent)
	requestHeaders.set("x-device-type", isMobile ? "mobile" : "desktop")

	// -----------------------------------------------------------------------
	// AUTH GUARD — wired in P2-T08
	// -----------------------------------------------------------------------
	// TODO(P2-T08): Check for authenticated session cookie.
	// Redirect unauthenticated users on protected routes to /login.
	// const hasSession = request.cookies.has('sb-access-token')
	//                 || request.cookies.has('guest_token');
	// if (!hasSession && isProtectedRoute(pathname)) {
	//   return NextResponse.redirect(new URL('/login', request.url));
	// }

	// -----------------------------------------------------------------------
	// GUEST TOKEN ROTATION — wired in P2-T08
	// -----------------------------------------------------------------------
	// TODO(P2-T08): Check guest_token cookie expiry, rotate if near expiry.
	// const guestToken = request.cookies.get('guest_token');
	// if (guestToken && isNearExpiry(guestToken.value)) {
	//   const refreshed = await rotateGuestToken(guestToken.value);
	//   if (refreshed) {
	//     response.cookies.set('guest_token', refreshed, { /* options */ });
	//   }
	// }

	// -----------------------------------------------------------------------
	// RATE LIMITING — wired in P2-T08
	// -----------------------------------------------------------------------
	// TODO(P2-T08): Lightweight rate-limit check for API routes.
	// Token-bucket or sliding-window via Redis / KV.
	// if (pathname.startsWith('/api/') && isRateLimited(request)) {
	//   return NextResponse.json(
	//     { error: 'rate_limit_exceeded' },
	//     { status: 429 },
	//   );
	// }

	// --- Forward mutated request headers to downstream route handlers ---
	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	})
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
