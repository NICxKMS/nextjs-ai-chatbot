/**
 * Middleware Types
 *
 * Edge-compatible type definitions for composable middleware.
 * All types are designed for Next.js Edge Runtime.
 */

import type { NextFetchEvent, NextRequest, NextResponse } from "next/server";

/**
 * Result type for middleware functions.
 * - NextResponse: Short-circuit with response
 * - Response: Short-circuit with raw Response
 * - undefined: Continue to next middleware
 */
export type MiddlewareResult =
    | NextResponse
    | Response
    | undefined
    | Promise<NextResponse | Response | undefined>;

/**
 * Composable middleware function signature.
 * Each middleware can either:
 * 1. Return a response (short-circuit the chain)
 * 2. Return undefined (continue to next middleware)
 */
export type MiddlewareFn = (
    request: NextRequest,
    event: NextFetchEvent,
    context: MiddlewareContext
) => MiddlewareResult;

/**
 * Context passed through middleware chain.
 * Accumulates data as request flows through middlewares.
 */
export type MiddlewareContext = {
    /** Unique request identifier (UUID v4) */
    requestId: string;

    /** Client IP address extracted from headers */
    clientIp: string;

    /** Request start timestamp for timing */
    startTime: number;

    /** Route tier for rate limiting */
    routeTier?: string;

    /** Whether request was rate limited */
    rateLimited?: boolean;

    /** Additional headers to add to response */
    responseHeaders: Headers;
};

/**
 * Rate limit tier configuration
 */
export type RateLimitTier = {
    /** Maximum requests allowed in window */
    limit: number;

    /** Time window in seconds */
    window: number;

    /** Redis key prefix */
    prefix: string;
};

/**
 * Route-specific rate limit configuration
 */
export type RouteRateLimitConfig = {
    /** URL pattern to match */
    pattern: RegExp;

    /** Rate limit tier name */
    tier: string;

    /** If true, deny requests when rate limiter is unavailable */
    failClosed: boolean;
};

/**
 * Rate limit check result
 */
export type RateLimitResult = {
    /** Whether request is allowed */
    allowed: boolean;

    /** Remaining requests in current window */
    remaining: number;

    /** Total limit for the window */
    limit: number;

    /** Seconds until rate limit resets (only if blocked) */
    retryAfter?: number | undefined;
};

/**
 * Options for rate limit check
 */
export type RateLimitOptions = {
    /** Unique identifier (usually IP address) */
    identifier: string;

    /** Maximum requests allowed */
    limit: number;

    /** Time window in seconds */
    windowSeconds: number;

    /** Redis key prefix */
    prefix?: string;

    /** Fail closed when Redis unavailable */
    failClosed?: boolean;
};

/**
 * Middleware configuration options
 */
export type MiddlewareConfig = {
    /** Enable request ID generation */
    requestId?: boolean;

    /** Enable rate limiting */
    rateLimit?: boolean;

    /** Enable security headers */
    securityHeaders?: boolean;

    /** Enable request logging */
    logging?: boolean;
};
