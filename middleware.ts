/**
 * Next.js Edge Middleware
 * Ref: Edge Runtime Configuration
 *
 * Rate limiting and request processing at the edge.
 * Issue #244: Guest rate limiting to prevent session flooding.
 * Issue #75: Correlation IDs for request tracing.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
    checkRateLimit,
    getIpIdentifier,
    getOrCreateRequestId,
    type LimiterType,
    rateLimitResponse,
    setRequestIdHeaders,
} from "@/lib/middleware";

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
 * Guests use stricter limits via guestLimiter.
 */
const routeLimiterMap: Record<string, LimiterType> = {
    // Auth endpoints - stricter limits to prevent brute force
    "/api/auth/login": "auth",
    "/api/auth/register": "auth",
    "/api/auth/callback": "auth",

    // Chat/AI endpoints - token bucket for burst handling
    "/api/chat": "chat",

    // Upload endpoints - very strict limits (per hour)
    "/api/files/upload": "upload",

    // Search endpoints - generous limits
    "/api/suggestions": "search",

    // Standard API endpoints
    "/api/document": "standard",
    "/api/vote": "standard",
    "/api/history": "standard",
};

/** Guest rate limit multiplier - guests get stricter limits */
const _GUEST_LIMIT_MULTIPLIER = 0.5; // 50% of authenticated limits

/**
 * Stricter limiter types for guest users.
 * Maps authenticated limiter types to their guest equivalents.
 */
const guestLimiterOverrides: Partial<Record<LimiterType, LimiterType>> = {
    standard: "guest", // 100 -> 20 req/min
    chat: "guest", // 50 -> 20 req/min
    search: "standard", // 1000 -> 100 req/min (use standard for guests)
};

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
 * Get the appropriate limiter type based on route and auth status.
 */
function getLimiterType(
    pathname: string,
    isAuthenticated: boolean
): LimiterType {
    // Find matching route (longest prefix match)
    let baseLimiterType: LimiterType = "standard";
    let longestMatch = 0;

    for (const [route, type] of Object.entries(routeLimiterMap)) {
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

    // For guests, apply stricter limits
    return guestLimiterOverrides[baseLimiterType] ?? "guest";
}

// ============== MIDDLEWARE ==============

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Generate or propagate request ID for tracing
    const requestId = getOrCreateRequestId(request);

    // Skip rate limiting for non-API routes
    if (!pathname.startsWith("/api")) {
        return createSecureResponse(requestId);
    }

    // Skip rate limiting for health check endpoints
    if (pathname === "/api/health" || pathname === "/api/ping") {
        return createSecureResponse(requestId);
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
         * Match all API routes except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/api/:path*",
    ],
};
