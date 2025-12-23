/**
 * Rate Limit Configuration
 * Ref: CLN-003 - Consolidated rate limit configuration
 *
 * Single source of truth for all rate limit settings.
 * Used by middleware.ts and lib/middleware/rate-limit.ts
 */

/**
 * Rate limit preset configuration
 * All values are in requests per time window
 */
export const RATE_LIMITS = {
    /** Standard API: 100 requests per 60 seconds */
    standard: { requests: 100, window: "60s" as const },

    /** Strict: 10 requests per 60 seconds (sensitive operations like guest creation) */
    strict: { requests: 10, window: "60s" as const },

    /** Auth: 20 requests per 60 seconds */
    auth: { requests: 20, window: "60s" as const },

    /** Chat/AI: 50 requests per 60 seconds with burst of 10 */
    chat: { requests: 50, window: "60s" as const, burst: 10 },

    /** Upload: 10 requests per hour */
    upload: { requests: 10, window: "1h" as const },

    /** Guest: 20 requests per 60 seconds (stricter than standard) */
    guest: { requests: 20, window: "60s" as const },

    /** Search: 1000 requests per 60 seconds (generous) */
    search: { requests: 1000, window: "60s" as const },

    /** Global IP: 100 requests per 60 seconds (applies to all requests) */
    globalIp: { requests: 100, window: "60s" as const },
} as const;

/**
 * Route to limiter type mapping
 * CLN-003: Centralized route configuration
 */
export const ROUTE_LIMITER_MAP: Record<string, keyof typeof RATE_LIMITS> = {
    // Auth endpoints - stricter limits to prevent brute force
    "/api/auth/login": "auth",
    "/api/auth/register": "auth",
    "/api/auth/callback": "auth",
    "/api/auth/guest": "strict", // CLN-003: Guest creation uses strict limiter
    "/api/auth/exchange": "auth", // Token exchange needs auth-level protection
    "/api/auth/logout": "auth", // Logout should match login limits

    // Chat/AI endpoints - token bucket for burst handling
    "/api/chat": "chat",
    "/api/chat/": "chat", // Chat sub-routes (e.g., /api/chat/[id]) get chat limiter

    // Upload endpoints - very strict limits (per hour)
    "/api/files/upload": "upload",

    // Search endpoints - generous limits
    "/api/suggestions": "search",

    // Standard API endpoints
    "/api/document": "standard",
    "/api/vote": "standard",
    "/api/history": "standard",
} as const;

/**
 * Guest limiter overrides
 * Maps authenticated limiter types to their guest equivalents
 * CLN-003: Centralized guest override configuration
 */
export const GUEST_LIMITER_OVERRIDES: Partial<
    Record<keyof typeof RATE_LIMITS, keyof typeof RATE_LIMITS>
> = {
    standard: "guest", // 100 -> 20 req/min
    chat: "guest", // 50 -> 20 req/min
    search: "standard", // 1000 -> 100 req/min (use standard for guests)
} as const;

export type LimiterType = keyof typeof RATE_LIMITS;
