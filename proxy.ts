import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import {
    GUEST_CACHE_TTL_SECONDS,
    GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS,
    GUEST_TOKEN_TTL_SECONDS,
    isProductionEnvironment,
} from "./lib/constants";
import {
    EdgeRateLimiters,
    getClientIP,
} from "./lib/middleware/edge-rate-limit";

// Note: Next.js 16 Proxy files always run on Node.js runtime
// Edge runtime is not configurable for proxy.ts - it runs on Vercel's edge network
// via their internal proxy infrastructure

const GUEST_COOKIE_NAME = "guest_token";
// Cookie TTL (7 days) - how long guest identity persists
const GUEST_COOKIE_TTL_SECONDS = GUEST_CACHE_TTL_SECONDS;
// JWT TTL (1 hour) - how long token is valid (Task 7.6)
const GUEST_JWT_TTL_SECONDS = GUEST_TOKEN_TTL_SECONDS;

// Pre-encode secret once at module load for performance
const GUEST_JWT_SECRET = process.env.GUEST_JWT_SECRET
    ? new TextEncoder().encode(process.env.GUEST_JWT_SECRET)
    : null;

// Routes that don't need guest session creation
const SKIP_GUEST_SESSION_PATHS = new Set(["/api/", "/login", "/register"]);

// Mobile device detection pattern (covers common mobile user agents)
const MOBILE_UA_PATTERN =
    /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|webos/i;

// API routes that skip all edge rate limiting (health checks only)
const SKIP_EDGE_RATE_LIMIT_PATHS = ["/api/health"];

// Auth routes get stricter edge rate limiting
const AUTH_RATE_LIMIT_PATHS = ["/api/auth/"];

function shouldSkipGuestSession(pathname: string): boolean {
    if (pathname.startsWith("/api/")) {
        return true;
    }
    return SKIP_GUEST_SESSION_PATHS.has(pathname);
}

function shouldApplyEdgeRateLimit(pathname: string): boolean {
    if (!pathname.startsWith("/api/")) {
        return false;
    }
    return !SKIP_EDGE_RATE_LIMIT_PATHS.some((path) =>
        pathname.startsWith(path)
    );
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_RATE_LIMIT_PATHS.some((path) => pathname.startsWith(path));
}

async function verifyGuestToken(
    token: string,
    secret: Uint8Array
): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        if (payload.type === "guest" && typeof payload.sub === "string") {
            return payload;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Create a new guest token with 1-hour JWT TTL (Task 7.6)
 * @param secret - JWT signing secret
 * @param existingGuestId - Optional existing guest ID for token rotation
 */
function createGuestToken(
    secret: Uint8Array,
    existingGuestId?: string
): Promise<string> {
    // Reuse existing guest ID for rotation, or create new one
    const guestId = existingGuestId ?? `guest:${crypto.randomUUID()}`;
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + GUEST_JWT_TTL_SECONDS;

    return new SignJWT({
        sub: guestId,
        type: "guest",
        iat: issuedAtSeconds,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(secret);
}

/**
 * Check if guest token needs rotation (Task 7.6)
 * Rotate when less than threshold time remains before expiration
 */
function shouldRotateToken(payload: JWTPayload): boolean {
    if (typeof payload.exp !== "number") {
        return true; // No expiration, should rotate
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const timeRemaining = payload.exp - nowSeconds;
    return timeRemaining < GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Fast path: Playwright health check
    if (pathname === "/ping") {
        return new Response("pong", { status: 200 });
    }

    // Edge rate limiting for API routes (IP-based, runs before hitting Node.js)
    if (shouldApplyEdgeRateLimit(pathname)) {
        const ip = getClientIP(request);

        // Use stricter rate limit for auth routes, standard for others
        const result = isAuthRoute(pathname)
            ? await EdgeRateLimiters.auth(ip)
            : await EdgeRateLimiters.api(ip);

        if (!result.allowed) {
            return new Response(
                JSON.stringify({
                    error: "rate_limit_exceeded",
                    message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
                    retryAfter: result.retryAfter,
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "X-RateLimit-Limit": result.limit.toString(),
                        "X-RateLimit-Remaining": result.remaining.toString(),
                        "Retry-After": (result.retryAfter || 60).toString(),
                    },
                }
            );
        }
    }

    const response = NextResponse.next();

    // Mobile detection via User-Agent header (Task 1.2)
    const userAgent = request.headers.get("user-agent") || "";
    const isMobileDevice = MOBILE_UA_PATTERN.test(userAgent);
    response.headers.set(
        "x-device-type",
        isMobileDevice ? "mobile" : "desktop"
    );

    // Skip guest session for API routes and auth pages
    if (shouldSkipGuestSession(pathname)) {
        return response;
    }

    // Guest auth not configured - skip session creation
    if (!GUEST_JWT_SECRET) {
        return response;
    }

    // Fast path: Check if guest token cookie exists first (single O(1) lookup)
    const guestToken = request.cookies.get(GUEST_COOKIE_NAME)?.value;
    if (guestToken) {
        // Verify the token is still valid (not expired/tampered)
        const payload = await verifyGuestToken(guestToken, GUEST_JWT_SECRET);
        if (payload) {
            // Task 7.6: Token Rotation - check if token needs rotation
            if (shouldRotateToken(payload)) {
                // Rotate token while preserving the same guest ID
                const newToken = await createGuestToken(
                    GUEST_JWT_SECRET,
                    payload.sub as string
                );
                response.cookies.set(GUEST_COOKIE_NAME, newToken, {
                    httpOnly: true,
                    secure: isProductionEnvironment,
                    path: "/",
                    maxAge: GUEST_COOKIE_TTL_SECONDS,
                    sameSite: "lax",
                });
            }
            return response;
        }
        // Token invalid/expired - fall through to create new one
    }

    // Task 7.8: Check for specific Supabase access token cookie instead of prefix match
    // This is more precise and avoids false positives from other Supabase cookies
    const supabaseAccessTokenName =
        process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME || "sb-access-token";
    const hasSupabaseSession = request.cookies.has(supabaseAccessTokenName);

    if (hasSupabaseSession) {
        return response;
    }

    // No valid session - create guest session
    const token = await createGuestToken(GUEST_JWT_SECRET);

    response.cookies.set(GUEST_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProductionEnvironment,
        path: "/",
        maxAge: GUEST_COOKIE_TTL_SECONDS,
        sameSite: "lax",
    });

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all paths except static assets and metadata files.
         * Guest session logic inside proxy() handles further filtering.
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
