/**
 * Edge Rate Limiting Middleware
 *
 * Implements rate limiting at the Edge using Upstash Redis.
 * Uses HTTP API (fetch-based) for Edge runtime compatibility.
 *
 * Features:
 * - Route-based rate limit tiers
 * - Fail-open/fail-closed per route
 * - Rate limit headers on responses
 * - Sliding window algorithm
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";
import { getRouteTier } from "./routes";
import type { MiddlewareContext, MiddlewareFn, RateLimitResult } from "./types";

/**
 * Create Upstash Redis client for Edge runtime.
 * Returns null if credentials are not configured.
 */
function getEdgeRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!(url && token)) {
        return null;
    }

    return new Redis({ url, token });
}

/**
 * Cache for rate limiters to avoid recreating on each request.
 */
const limiterCache = new Map<string, Ratelimit>();

/**
 * Get or create a rate limiter for the given tier.
 */
function getRateLimiter(
    prefix: string,
    limit: number,
    window: number
): Ratelimit | null {
    const cacheKey = `${prefix}:${limit}:${window}`;

    const cached = limiterCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const redis = getEdgeRedis();
    if (!redis) {
        return null;
    }

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${window}s`),
        prefix,
        analytics: true,
    });

    limiterCache.set(cacheKey, limiter);
    return limiter;
}

/**
 * Options for rate limit check
 */
type CheckRateLimitOptions = {
    identifier: string;
    limit: number;
    window: number;
    prefix: string;
    failClosed: boolean;
};

/**
 * Check rate limit for an identifier.
 */
async function checkRateLimit(
    options: CheckRateLimitOptions
): Promise<RateLimitResult> {
    const { identifier, limit, window, prefix, failClosed } = options;
    const limiter = getRateLimiter(prefix, limit, window);

    if (!limiter) {
        // Redis not available
        if (failClosed) {
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfter: 60,
            };
        }
        // Fail open
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
        // Error checking rate limit
        if (failClosed) {
            return {
                allowed: false,
                remaining: 0,
                limit,
                retryAfter: 60,
            };
        }
        // Fail open on error
        return {
            allowed: true,
            remaining: limit,
            limit,
        };
    }
}

/**
 * Create a 429 Too Many Requests response.
 */
function createRateLimitResponse(
    result: RateLimitResult,
    requestId: string
): NextResponse {
    const response = NextResponse.json(
        {
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: result.retryAfter,
        },
        { status: 429 }
    );

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("Retry-After", String(result.retryAfter || 60));
    response.headers.set("x-request-id", requestId);

    return response;
}

/**
 * Rate limit middleware.
 *
 * Checks rate limits based on route configuration.
 * Returns 429 response if limit exceeded, undefined to continue.
 */
export const rateLimitMiddleware: MiddlewareFn = async (
    request: NextRequest,
    _event,
    context: MiddlewareContext
) => {
    const pathname = request.nextUrl.pathname;
    const routeConfig = getRouteTier(pathname);

    // No rate limiting for this route
    if (!routeConfig) {
        return;
    }

    const { tier, failClosed } = routeConfig;
    const identifier = context.clientIp;

    // Store tier in context for logging
    context.routeTier = tier.prefix;

    const result = await checkRateLimit({
        identifier,
        limit: tier.limit,
        window: tier.window,
        prefix: tier.prefix,
        failClosed,
    });

    // Add rate limit headers to context for response
    context.responseHeaders.set("X-RateLimit-Limit", String(result.limit));
    context.responseHeaders.set(
        "X-RateLimit-Remaining",
        String(result.remaining)
    );

    if (!result.allowed) {
        context.rateLimited = true;
        return createRateLimitResponse(result, context.requestId);
    }

    return;
};

/**
 * Check rate limit directly (for use outside middleware chain).
 *
 * @param identifier - Unique identifier (e.g., IP address)
 * @param tierName - Rate limit tier name
 * @returns Rate limit result
 */
export async function checkEdgeRateLimit(
    identifier: string,
    tierName: string
): Promise<RateLimitResult> {
    const { getRouteTier: _, ...tiers } = await import("./routes").then(
        (m) => m.RATE_LIMIT_TIERS
    );

    const tier = tiers[tierName as keyof typeof tiers];

    if (!tier) {
        return { allowed: true, remaining: 100, limit: 100 };
    }

    return checkRateLimit({
        identifier,
        limit: tier.limit,
        window: tier.window,
        prefix: tier.prefix,
        failClosed: false,
    });
}
