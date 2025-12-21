/**
 * Next.js Edge Middleware
 * Ref: Edge Runtime Configuration
 *
 * Rate limiting and request processing at the edge.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
    createRateLimitMiddleware,
    type LimiterType,
} from "@/lib/middleware/rate-limit";

// ============== RATE LIMIT CONFIGURATION ==============

const rateLimitMiddleware = createRateLimitMiddleware({
    routes: {
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
    } satisfies Record<string, LimiterType>,
    defaultType: "standard",
});

// ============== MIDDLEWARE ==============

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip rate limiting for non-API routes
    if (!pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    // Skip rate limiting for health check endpoints
    if (pathname === "/api/health" || pathname === "/api/ping") {
        return NextResponse.next();
    }

    // Check rate limit
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) {
        return rateLimitResult;
    }

    // Rate limit passed, continue with the request
    return NextResponse.next();
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
