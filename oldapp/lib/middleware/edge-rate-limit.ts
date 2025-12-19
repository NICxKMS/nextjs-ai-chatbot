/**
 * Edge-Compatible Rate Limiting
 *
 * This module provides rate limiting that can run in Next.js Edge Runtime.
 * It uses Upstash Redis HTTP API directly without server-only imports.
 *
 * @see lib/middleware/rate-limit.ts for the full Node.js version
 * @see lib/middleware/rate-limit-config.ts for centralized rate limit constants
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS } from "./rate-limit-config";

export type EdgeRateLimitResult = {
    allowed: boolean;
    remaining: number;
    limit: number;
    retryAfter?: number;
};

// Create Redis client for edge (uses fetch, edge-compatible)
function getEdgeRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return null;
    }

    return new Redis({
        url,
        token,
    });
}

/**
 * Create an edge-compatible rate limiter
 * Uses @upstash/ratelimit which is designed for edge runtime
 */
function createEdgeRateLimiter(
    limit: number,
    window: number,
    prefix: string
): Ratelimit | null {
    const redis = getEdgeRedis();
    if (!redis) {
        return null;
    }

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${window}s`),
        prefix,
        analytics: true,
    });
}

/**
 * Options for edge rate limiting
 */
export type EdgeRateLimitOptions = {
    /** Unique identifier for rate limiting (e.g., IP address) */
    identifier: string;
    /** Maximum requests allowed */
    limit: number;
    /** Time window in seconds */
    windowSeconds: number;
    /** Redis key prefix (default: "edge_rate_limit") */
    prefix?: string;
    /** If true, fail closed (deny) when Redis unavailable (default: false) */
    failClosed?: boolean;
};

/**
 * Check rate limit at edge
 * Returns result immediately without database dependencies
 */
export async function checkEdgeRateLimit(
    options: EdgeRateLimitOptions
): Promise<EdgeRateLimitResult> {
    const {
        identifier,
        limit,
        windowSeconds,
        prefix = "edge_rate_limit",
        failClosed = false,
    } = options;

    const limiter = createEdgeRateLimiter(limit, windowSeconds, prefix);

    if (!limiter) {
        // Task 7.5: Fail closed for auth endpoints when Redis unavailable
        if (failClosed) {
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfter: 60, // Suggest retry after 1 minute
            };
        }
        // Fail open for non-critical endpoints if Redis unavailable
        return {
            allowed: true,
            remaining: limit,
            limit,
        };
    }

    try {
        const result = await limiter.limit(identifier);

        return {
            allowed: result.success,
            remaining: result.remaining,
            limit: result.limit,
            retryAfter: result.success
                ? undefined
                : Math.ceil((result.reset - Date.now()) / 1000),
        };
    } catch {
        // Task 7.5: Fail closed for auth endpoints on error
        if (failClosed) {
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfter: 60,
            };
        }
        // Fail open on error for non-critical endpoints
        return {
            allowed: true,
            remaining: limit,
            limit,
        };
    }
}

/**
 * Pre-configured edge rate limiters
 * Uses centralized constants from rate-limit-config.ts
 */
export const EdgeRateLimiters = {
    /** API routes: General API protection (fail open) */
    api: (identifier: string) =>
        checkEdgeRateLimit({
            identifier,
            limit: RATE_LIMITS.EDGE_API.limit,
            windowSeconds: RATE_LIMITS.EDGE_API.window,
            prefix: RATE_LIMITS.EDGE_API.prefix,
            failClosed: false, // fail open for general API
        }),

    /** Strict: For sensitive operations (fail open) */
    strict: (identifier: string) =>
        checkEdgeRateLimit({
            identifier,
            limit: RATE_LIMITS.EDGE_STRICT.limit,
            windowSeconds: RATE_LIMITS.EDGE_STRICT.window,
            prefix: RATE_LIMITS.EDGE_STRICT.prefix,
            failClosed: false, // fail open for strict
        }),

    /** Auth: For authentication endpoints (FAIL CLOSED - Task 7.5) */
    auth: (identifier: string) =>
        checkEdgeRateLimit({
            identifier,
            limit: RATE_LIMITS.EDGE_AUTH.limit,
            windowSeconds: RATE_LIMITS.EDGE_AUTH.window,
            prefix: RATE_LIMITS.EDGE_AUTH.prefix,
            failClosed: true, // fail closed for auth - deny requests if Redis unavailable
        }),
};

/**
 * Get client IP from request headers (edge-compatible)
 */
export function getClientIP(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() ?? "unknown";
    }

    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    return "unknown";
}
