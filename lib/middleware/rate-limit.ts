/**
 * Upstash Rate Limiting for Edge Functions
 * Ref: oldapp/lib/middleware/edge-rate-limit.ts
 *
 * Algorithms:
 * - Sliding Window: Most endpoints (auth, API)
 * - Token Bucket: AI/Chat (burst handling)
 * - Fixed Window: Uploads (simple counting)
 *
 * Features:
 * - Edge-compatible (no Node.js APIs)
 * - Ephemeral cache for attack mitigation
 * - Fail-open by default (configurable)
 * - Analytics enabled for Upstash dashboard
 *
 * CLN-003: Uses centralized config from rate-limit-config.ts
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/utils/logger";
import { type LimiterType, RATE_LIMITS } from "./rate-limit-config";

// ============== REDIS CLIENT (EDGE) ==============

/**
 * Create Edge-compatible Redis client
 * Does NOT use server-only directive (Edge compatible)
 */
function getEdgeRedis(): Redis | null {
    const url = process.env.CACHE_KV_REST_API_URL;
    const token = process.env.CACHE_KV_REST_API_TOKEN;

    if (!url || !token) {
        return null;
    }

    return new Redis({ url, token });
}

// Create Redis instance once
const redis = getEdgeRedis();

// Ephemeral cache for reducing Redis calls under attack
// This is a local Map that caches rate limit decisions briefly
const ephemeralCache = new Map<string, number>();

// ============== PRESET LIMITERS ==============

/**
 * Create a rate limiter with fallback handling
 *
 * Configuration:
 * - timeout: 1000ms - Controls max latency at the edge; if Redis is slow,
 *   the request fails closed rather than hanging indefinitely
 * - enableProtection: Enables Upstash's enhanced DDoS protection features
 *   including deny lists managed via the Upstash dashboard
 */
function createLimiter(
    limiter: ReturnType<typeof Ratelimit.slidingWindow>,
    prefix: string
): Ratelimit | null {
    if (!redis) {
        return null;
    }

    return new Ratelimit({
        redis,
        limiter,
        analytics: true,
        prefix,
        ephemeralCache,
        timeout: 1000, // 1 second timeout for edge latency control
        enableProtection: true, // Enhanced DDoS protection (deny lists via dashboard)
    });
}

// CLN-003: Limiters now reference centralized RATE_LIMITS config

/** Standard API: Uses RATE_LIMITS.standard */
export const standardLimiter = createLimiter(
    Ratelimit.slidingWindow(
        RATE_LIMITS.standard.requests,
        RATE_LIMITS.standard.window
    ),
    "ratelimit:standard"
);

/** Strict: Uses RATE_LIMITS.strict (sensitive operations) */
export const strictLimiter = createLimiter(
    Ratelimit.slidingWindow(
        RATE_LIMITS.strict.requests,
        RATE_LIMITS.strict.window
    ),
    "ratelimit:strict"
);

/** Auth: Uses RATE_LIMITS.auth */
export const authLimiter = createLimiter(
    Ratelimit.slidingWindow(RATE_LIMITS.auth.requests, RATE_LIMITS.auth.window),
    "ratelimit:auth"
);

/** Chat/AI: Uses RATE_LIMITS.chat with burst support */
export const chatLimiter = createLimiter(
    Ratelimit.tokenBucket(
        RATE_LIMITS.chat.requests,
        RATE_LIMITS.chat.window,
        RATE_LIMITS.chat.burst ?? 10
    ),
    "ratelimit:chat"
);

/** Upload: Uses RATE_LIMITS.upload */
export const uploadLimiter = createLimiter(
    Ratelimit.fixedWindow(
        RATE_LIMITS.upload.requests,
        RATE_LIMITS.upload.window
    ),
    "ratelimit:upload"
);

/** Guest: Uses RATE_LIMITS.guest */
export const guestLimiter = createLimiter(
    Ratelimit.slidingWindow(
        RATE_LIMITS.guest.requests,
        RATE_LIMITS.guest.window
    ),
    "ratelimit:guest"
);

/** Search: Uses RATE_LIMITS.search */
export const searchLimiter = createLimiter(
    Ratelimit.slidingWindow(
        RATE_LIMITS.search.requests,
        RATE_LIMITS.search.window
    ),
    "ratelimit:search"
);

// ============== LIMITER MAP ==============

// CLN-003: LimiterType re-exported from rate-limit-config.ts
export type { LimiterType } from "./rate-limit-config";

export const limiters: Record<LimiterType, Ratelimit | null> = {
    standard: standardLimiter,
    strict: strictLimiter,
    auth: authLimiter,
    chat: chatLimiter,
    upload: uploadLimiter,
    guest: guestLimiter,
    search: searchLimiter,
    globalIp: standardLimiter, // Global IP uses standard limiter
};

// CLN-003: Default limits derived from centralized config
const DEFAULT_LIMITS: Record<LimiterType, number> = {
    standard: RATE_LIMITS.standard.requests,
    strict: RATE_LIMITS.strict.requests,
    auth: RATE_LIMITS.auth.requests,
    chat: RATE_LIMITS.chat.requests,
    upload: RATE_LIMITS.upload.requests,
    guest: RATE_LIMITS.guest.requests,
    search: RATE_LIMITS.search.requests,
    globalIp: RATE_LIMITS.globalIp.requests,
};

// ============== RATE LIMIT HELPERS ==============

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    pending: Promise<unknown>;
}

/**
 * Check rate limit for an identifier
 *
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param type - Type of limiter to use
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
    identifier: string,
    type: LimiterType = "standard"
): Promise<RateLimitResult> {
    const limiter = limiters[type];

    // If no limiter (Redis not configured), fail closed for security
    if (!limiter) {
        logger.error(
            "Redis unavailable - blocking request for safety (rate-limit)"
        );
        const defaultLimit = DEFAULT_LIMITS[type];
        return {
            success: false,
            limit: defaultLimit,
            remaining: 0,
            reset: Date.now() + 60_000,
            pending: Promise.resolve(),
        };
    }

    const result = await limiter.limit(identifier);

    return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        pending: result.pending,
    };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
    return {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
    };
}

/**
 * Create rate limit error response (429)
 */
export function rateLimitResponse(result: RateLimitResult): Response {
    const retryAfter = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000)
    );

    return new Response(
        JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter,
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                ...getRateLimitHeaders(result),
                "Retry-After": retryAfter.toString(),
            },
        }
    );
}

// ============== IDENTIFIER EXTRACTORS ==============

export type IdentifierExtractor = (
    request: Request
) => string | Promise<string>;

/**
 * Extract IP from request (Edge compatible)
 * Checks various headers in order of preference
 */
export function getIpIdentifier(request: Request): string {
    // Vercel-specific header (most reliable on Vercel)
    const vercelIp = request.headers.get("x-vercel-forwarded-for");
    if (vercelIp) {
        const firstIp = vercelIp.split(",")[0];
        if (firstIp) {
            return firstIp.trim();
        }
    }

    // Standard forwarded header
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const firstIp = forwarded.split(",")[0];
        if (firstIp) {
            return firstIp.trim();
        }
    }

    // Real IP header (set by some proxies)
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback for local development
    return "127.0.0.1";
}

/**
 * Extract user ID from session cookie
 * Falls back to IP if no valid session
 */
export async function getUserIdentifier(request: Request): Promise<string> {
    const ip = getIpIdentifier(request);

    // Try to get session from cookie
    const cookies = request.headers.get("cookie");
    if (!cookies) {
        return `ip:${ip}`;
    }

    const sessionMatch = cookies.match(/authjs\.session-token=([^;]+)/);
    if (!sessionMatch?.[1]) {
        return `ip:${ip}`;
    }

    try {
        // JWT format: header.payload.signature
        const token = sessionMatch[1];
        const parts = token.split(".");
        if (parts.length !== 3 || !parts[1]) {
            return `ip:${ip}`;
        }

        // Decode payload (base64url)
        const payload = JSON.parse(
            atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        ) as { sub?: string };

        if (payload.sub) {
            return `user:${payload.sub}`;
        }
    } catch {
        // Invalid session, fallback to IP
    }

    return `ip:${ip}`;
}

// ============== HOF FOR API HANDLERS ==============

/**
 * Higher-order function for rate-limited API handlers
 *
 * @example
 * export const POST = withRateLimit(async (req) => {
 *   // Your handler logic
 *   return Response.json({ success: true });
 * }, { type: "chat" });
 */
export function withRateLimit<
    T extends (request: Request, ...args: unknown[]) => Promise<Response>,
>(
    handler: T,
    options: {
        type?: LimiterType;
        getIdentifier?: IdentifierExtractor;
        failOpen?: boolean;
    } = {}
): T {
    const {
        type = "standard",
        getIdentifier = getIpIdentifier,
        failOpen = true,
    } = options;

    return (async (request: Request, ...args: unknown[]) => {
        try {
            const identifier = await getIdentifier(request);
            const result = await checkRateLimit(identifier, type);

            if (!result.success) {
                return rateLimitResponse(result);
            }

            // Execute handler
            const response = await handler(request, ...args);

            // Add rate limit headers to response
            const headers = new Headers(response.headers);
            const rateLimitHeaders = getRateLimitHeaders(result);
            for (const [key, value] of Object.entries(rateLimitHeaders)) {
                headers.set(key, value);
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        } catch (error) {
            // If rate limiting fails and failOpen is true, allow the request
            if (failOpen) {
                logger.warn("[RateLimit] Redis error, failing open", { error });
                return handler(request, ...args);
            }

            // failOpen is false, return 503
            return new Response(
                JSON.stringify({
                    error: "Service Unavailable",
                    message: "Rate limiting service temporarily unavailable.",
                }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }) as T;
}

// ============== EDGE MIDDLEWARE INTEGRATION ==============

export interface MiddlewareConfig {
    /** Route prefix to limiter type mapping */
    routes: Record<string, LimiterType>;
    /** Default limiter type for unmatched routes */
    defaultType?: LimiterType;
    /** Custom identifier extractor */
    getIdentifier?: IdentifierExtractor;
    /** Whether to fail open on errors (default: true) */
    failOpen?: boolean;
}

/**
 * Create rate limit middleware for Next.js Edge
 *
 * @example
 * // middleware.ts
 * import { createRateLimitMiddleware } from "@/lib/middleware/rate-limit";
 *
 * const rateLimitMiddleware = createRateLimitMiddleware({
 *   routes: {
 *     "/api/auth": "auth",
 *     "/api/chat": "chat",
 *     "/api/files/upload": "upload",
 *   },
 *   defaultType: "standard",
 * });
 *
 * export async function middleware(request: NextRequest) {
 *   const rateLimitResult = await rateLimitMiddleware(request);
 *   if (rateLimitResult) return rateLimitResult;
 *   return NextResponse.next();
 * }
 */
export function createRateLimitMiddleware(config: MiddlewareConfig) {
    const {
        routes,
        defaultType = "standard",
        getIdentifier = getIpIdentifier,
        failOpen = true,
    } = config;

    return async (request: Request): Promise<Response | null> => {
        const pathname = new URL(request.url).pathname;

        // Find matching route (longest prefix match)
        let limiterType = defaultType;
        let longestMatch = 0;

        for (const [route, type] of Object.entries(routes)) {
            if (pathname.startsWith(route) && route.length > longestMatch) {
                limiterType = type;
                longestMatch = route.length;
            }
        }

        try {
            const identifier = await getIdentifier(request);
            const result = await checkRateLimit(identifier, limiterType);

            if (!result.success) {
                return rateLimitResponse(result);
            }

            // Rate limit passed, continue (return null)
            return null;
        } catch (error) {
            // Handle errors based on failOpen setting
            if (failOpen) {
                logger.warn("[RateLimit Middleware] Error, failing open", {
                    error,
                });
                return null;
            }

            // Fail closed - return 503
            return new Response(
                JSON.stringify({
                    error: "Service Unavailable",
                    message: "Rate limiting service temporarily unavailable.",
                }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    };
}

// ============== UTILITY EXPORTS ==============

/**
 * Check if rate limiting is available (Redis configured)
 */
export function isRateLimitingAvailable(): boolean {
    return redis !== null;
}
