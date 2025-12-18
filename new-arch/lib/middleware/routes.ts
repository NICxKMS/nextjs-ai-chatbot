/**
 * Route Configuration
 *
 * Defines route patterns and their associated configurations
 * for rate limiting, auth requirements, etc.
 */

import type { RateLimitTier, RouteRateLimitConfig } from "./types";

/**
 * Rate limit tiers with their configurations.
 * Values match centralized config in lib/middleware/rate-limit-config.ts
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
    /** Authentication endpoints - strict, fail-closed */
    auth: {
        limit: 20,
        window: 60,
        prefix: "edge:auth",
    },

    /** Strict operations - sensitive actions */
    strict: {
        limit: 10,
        window: 60,
        prefix: "edge:strict",
    },

    /** Chat/AI endpoints - moderate limits */
    chat: {
        limit: 50,
        window: 60,
        prefix: "edge:chat",
    },

    /** General API - standard protection */
    api: {
        limit: 100,
        window: 60,
        prefix: "edge:api",
    },

    /** File uploads - very strict (per hour) */
    upload: {
        limit: 10,
        window: 3600,
        prefix: "edge:upload",
    },

    /** Public routes - generous limits */
    generous: {
        limit: 1000,
        window: 60,
        prefix: "edge:generous",
    },
} as const;

/**
 * Route patterns mapped to rate limit configurations.
 * Order matters: first match wins.
 */
export const ROUTE_RATE_LIMITS: RouteRateLimitConfig[] = [
    // Auth routes - strict, fail-closed
    {
        pattern: /^\/api\/auth\//,
        tier: "auth",
        failClosed: true,
    },

    // Chat streaming - moderate, fail-open
    {
        pattern: /^\/api\/chat/,
        tier: "chat",
        failClosed: false,
    },

    // File operations - strict, fail-open
    {
        pattern: /^\/api\/files/,
        tier: "upload",
        failClosed: false,
    },

    // Document operations - standard, fail-open
    {
        pattern: /^\/api\/document/,
        tier: "api",
        failClosed: false,
    },

    // History operations - standard, fail-open
    {
        pattern: /^\/api\/history/,
        tier: "api",
        failClosed: false,
    },

    // General API - standard limits
    {
        pattern: /^\/api\//,
        tier: "api",
        failClosed: false,
    },

    // Public routes - generous limits
    {
        pattern: /^\//,
        tier: "generous",
        failClosed: false,
    },
];

/**
 * Routes that bypass rate limiting entirely
 */
const RATE_LIMIT_BYPASS_ROUTES = [
    /^\/_next\//, // Next.js internals
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
    /^\/health$/, // Health check endpoint
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
    /^\/$/,
    /^\/login$/,
    /^\/register$/,
    /^\/api\/auth\//,
    /^\/api\/health$/,
    /^\/_next\//,
    /^\/favicon\.ico$/,
];

/**
 * API route pattern
 */
const API_ROUTE_PATTERN = /^\/api\//;

/**
 * Match a route against rate limit configurations.
 *
 * @param pathname - URL pathname to match
 * @returns Matching route config or undefined
 */
export function matchRoute(pathname: string): RouteRateLimitConfig | undefined {
    // Check bypass routes first
    for (const pattern of RATE_LIMIT_BYPASS_ROUTES) {
        if (pattern.test(pathname)) {
            return;
        }
    }

    // Find matching route config
    for (const config of ROUTE_RATE_LIMITS) {
        if (config.pattern.test(pathname)) {
            return config;
        }
    }

    return;
}

/**
 * Get rate limit tier configuration for a route.
 *
 * @param pathname - URL pathname
 * @returns Tier config and fail-closed flag, or undefined for bypass
 */
export function getRouteTier(
    pathname: string
): { tier: RateLimitTier; failClosed: boolean } | undefined {
    const routeConfig = matchRoute(pathname);

    if (!routeConfig) {
        return;
    }

    const tier = RATE_LIMIT_TIERS[routeConfig.tier];

    if (!tier) {
        return;
    }

    return {
        tier,
        failClosed: routeConfig.failClosed,
    };
}

/**
 * Check if a route is public (no auth required).
 *
 * @param pathname - URL pathname to check
 * @returns true if route is public
 */
export function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some((pattern) => pattern.test(pathname));
}

/**
 * Check if a route is an API route.
 *
 * @param pathname - URL pathname to check
 * @returns true if route is an API route
 */
export function isApiRoute(pathname: string): boolean {
    return API_ROUTE_PATTERN.test(pathname);
}

/**
 * Check if a route should bypass all middleware processing.
 *
 * @param pathname - URL pathname to check
 * @returns true if route should be bypassed
 */
export function shouldBypass(pathname: string): boolean {
    return RATE_LIMIT_BYPASS_ROUTES.some((pattern) => pattern.test(pathname));
}
