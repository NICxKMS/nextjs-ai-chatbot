/**
 * Next.js Edge Middleware
 * Ref: Edge Runtime Configuration
 *
 * Rate limiting and request processing at the edge.
 * Issue #244: Guest rate limiting to prevent session flooding.
 * Issue #75: Correlation IDs for request tracing.
 * PERF-001: Guest session creation at edge to eliminate client waterfall.
 */

import { SignJWT } from "jose";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import {
    GUEST_CACHE_TTL_SECONDS,
    GUEST_TOKEN_COOKIE,
    JWT_AUDIENCE,
    JWT_EXPIRATION_SECONDS,
    JWT_ISSUER,
} from "@/lib/auth/constants";
import {
    checkRateLimit,
    getIpIdentifier,
    getOrCreateRequestId,
    type LimiterType,
    rateLimitResponse,
    setRequestIdHeaders,
} from "@/lib/middleware";
import {
    GUEST_LIMITER_OVERRIDES,
    ROUTE_LIMITER_MAP,
} from "@/lib/middleware/rate-limit-config";

// ============== SECURITY HEADERS ==============

const securityHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

/**
 * Creates a NextResponse.next() with security headers and request ID applied
 */
function createSecureResponse(requestId: string): NextResponse {
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
    }
    // Add correlation ID for request tracing
    setRequestIdHeaders(response.headers, requestId);
    return response;
}

// ============== RATE LIMIT CONFIGURATION ==============

/**
 * Route to limiter type mapping for authenticated users.
 * CLN-003: Configuration moved to lib/middleware/rate-limit-config.ts
 * Using centralized ROUTE_LIMITER_MAP and GUEST_LIMITER_OVERRIDES.
 */

// CLN-001: Removed _GUEST_LIMIT_MULTIPLIER (dead code) - guest limits implemented via guestLimiterOverrides
// CLN-003: guestLimiterOverrides moved to rate-limit-config.ts as GUEST_LIMITER_OVERRIDES

/**
 * Check if request has a valid session cookie.
 * Does NOT validate the session, just checks for presence.
 * Session validation happens in API routes.
 */
function hasSessionCookie(request: NextRequest): boolean {
    // Check for auth.js session token cookie
    const sessionCookie = request.cookies.get("authjs.session-token");
    if (sessionCookie?.value) {
        return true;
    }

    // Also check for secure cookie variant (HTTPS)
    const secureSessionCookie = request.cookies.get(
        "__Secure-authjs.session-token"
    );
    if (secureSessionCookie?.value) {
        return true;
    }

    return false;
}

/**
 * Check if request has a guest token cookie.
 * PERF-001: Used to skip edge session creation if already present.
 */
function hasGuestTokenCookie(request: NextRequest): boolean {
    return !!request.cookies.get(GUEST_TOKEN_COOKIE)?.value;
}

// ============== EDGE SESSION CREATION (PERF-001) ==============

/**
 * Generate a truncated SHA-256 hash (Edge-compatible)
 * Uses Web Crypto API which works in Edge runtime
 */
async function sha256Truncated(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hashHex.slice(0, 16);
}

/**
 * Create guest session JWT at edge level.
 * PERF-001: Eliminates client-side /api/auth/guest call waterfall.
 *
 * Uses edge-compatible APIs:
 * - Web Crypto for SHA-256 hashing
 * - jose library for JWT signing
 * - nanoid for guest ID generation
 */
async function createGuestSessionAtEdge(request: NextRequest): Promise<string> {
    const guestId = nanoid();

    // Extract device context for fingerprinting
    const ip =
        request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
    const userAgent =
        request.headers.get("user-agent")?.toLowerCase().trim() || "unknown";

    // Create device fingerprint using Web Crypto API
    const [ipHash, uaHash] = await Promise.all([
        sha256Truncated(ip),
        sha256Truncated(userAgent),
    ]);

    // Sign JWT using jose (edge-compatible)
    // SEC-004: Include audience claim for token binding
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    return new SignJWT({
        sub: `guest:${guestId}`,
        type: "guest",
        fp: { ipHash, uaHash },
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(`${JWT_EXPIRATION_SECONDS}s`)
        .sign(secret);
}

/**
 * Get the appropriate limiter type based on route and auth status.
 * CLN-003: Uses centralized ROUTE_LIMITER_MAP and GUEST_LIMITER_OVERRIDES.
 */
function getLimiterType(
    pathname: string,
    isAuthenticated: boolean
): LimiterType {
    // Find matching route (longest prefix match)
    let baseLimiterType: LimiterType = "standard";
    let longestMatch = 0;

    for (const [route, type] of Object.entries(ROUTE_LIMITER_MAP)) {
        if (pathname.startsWith(route) && route.length > longestMatch) {
            baseLimiterType = type;
            longestMatch = route.length;
        }
    }

    // Auth routes always use auth limiter regardless of auth status
    if (baseLimiterType === "auth") {
        return "auth";
    }

    // Upload routes always use strict limits
    if (baseLimiterType === "upload") {
        return "upload";
    }

    // For authenticated users, use the base limiter
    if (isAuthenticated) {
        return baseLimiterType;
    }

    // For guests, apply stricter limits (CLN-003: using centralized config)
    return GUEST_LIMITER_OVERRIDES[baseLimiterType] ?? "guest";
}

// ============== MIDDLEWARE ==============

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Generate or propagate request ID for tracing
    const requestId = getOrCreateRequestId(request);

    // ============== PAGE ROUTES: Edge Session Creation (PERF-001) ==============
    // For page requests, create guest session at edge if no session exists.
    // This eliminates the client-side waterfall of waiting for /api/auth/guest.

    if (!pathname.startsWith("/api")) {
        // Skip session creation for auth routes (login/register handle their own auth)
        const isAuthRoute =
            pathname.startsWith("/login") || pathname.startsWith("/register");

        // Check if any session already exists
        const hasAuth = hasSessionCookie(request);
        const hasGuest = hasGuestTokenCookie(request);

        // Create guest session at edge if no session exists and not on auth route
        if (!hasAuth && !hasGuest && !isAuthRoute) {
            try {
                const token = await createGuestSessionAtEdge(request);
                const response = createSecureResponse(requestId);

                // Set guest token cookie with same options as lib/auth/constants
                response.cookies.set(GUEST_TOKEN_COOKIE, token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: GUEST_CACHE_TTL_SECONDS,
                });

                return response;
            } catch (error) {
                // If session creation fails, continue without session
                // The app will fall back to client-side session creation
                if (process.env.NODE_ENV === "development") {
                    console.error(
                        "[PERF-001] Edge session creation failed:",
                        error
                    );
                }
            }
        }

        return createSecureResponse(requestId);
    }

    // ============== API ROUTES: Rate Limiting ==============

    // Skip rate limiting for health check endpoints
    if (pathname === "/api/health" || pathname === "/api/ping") {
        return createSecureResponse(requestId);
    }

    // SEC-002: Global IP rate limit (regardless of session)
    // Prevents abuse via session rotation or VPN/proxy hopping
    const ip = getIpIdentifier(request);
    const globalIpResult = await checkRateLimit(`global:${ip}`, "standard");
    if (!globalIpResult.success) {
        const headers = new Headers({
            "Retry-After": String(
                Math.ceil((globalIpResult.reset - Date.now()) / 1000)
            ),
            "X-RateLimit-Global": "exceeded",
        });
        for (const [key, value] of Object.entries(securityHeaders)) {
            headers.set(key, value);
        }
        setRequestIdHeaders(headers, requestId);

        return new Response("Too Many Requests", {
            status: 429,
            headers,
        });
    }

    // Determine if request is from authenticated user
    const isAuthenticated = hasSessionCookie(request);

    // Get appropriate limiter type based on route and auth status
    const limiterType = getLimiterType(pathname, isAuthenticated);

    // Get identifier (IP for guests, could be enhanced to user ID for auth)
    const identifier = isAuthenticated
        ? `auth:${getIpIdentifier(request)}` // Prefix to separate auth/guest buckets
        : `guest:${getIpIdentifier(request)}`;

    // Check rate limit
    const result = await checkRateLimit(identifier, limiterType);

    if (!result.success) {
        const response = rateLimitResponse(result);

        // Add security headers and request ID to rate limit response
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(securityHeaders)) {
            headers.set(key, value);
        }
        setRequestIdHeaders(headers, requestId);

        // Add guest indicator header for debugging
        if (!isAuthenticated) {
            headers.set("X-RateLimit-Guest", "true");
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }

    // Rate limit passed, continue with the request
    return createSecureResponse(requestId);
}

// ============== MATCHER CONFIG ==============

export const config = {
    matcher: [
        /*
         * Match all routes except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (SEO files)
         * - public folder assets
         *
         * PERF-001: Added page routes for edge session creation
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/).*)",
    ],
};
