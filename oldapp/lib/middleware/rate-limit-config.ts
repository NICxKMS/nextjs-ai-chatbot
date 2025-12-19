/**
 * Centralized Rate Limit Configuration
 *
 * All rate limit constants are defined here for consistency between
 * Edge middleware and Node.js route handlers.
 *
 * This ensures:
 * - Single source of truth for rate limit values
 * - Easy adjustment of limits without searching multiple files
 * - Consistent naming and documentation
 */

/**
 * Rate limit presets with limit (requests) and window (seconds)
 */
export const RATE_LIMITS = {
    /**
     * Edge API rate limit - broad protection for all API routes
     * Applied at Vercel Edge before reaching Node.js
     */
    EDGE_API: {
        limit: 100,
        window: 60,
        prefix: "edge:api",
    },

    /**
     * Edge strict rate limit - for sensitive operations
     */
    EDGE_STRICT: {
        limit: 10,
        window: 60,
        prefix: "edge:strict",
    },

    /**
     * Edge auth rate limit - for authentication endpoints
     * Stricter than general API to prevent brute force
     */
    EDGE_AUTH: {
        limit: 20,
        window: 60,
        prefix: "edge:auth",
    },

    /**
     * Strict rate limit - for destructive or sensitive operations
     * Example: delete operations, admin actions
     */
    STRICT: {
        limit: 10,
        window: 60,
        namespace: "strict",
    },

    /**
     * Standard rate limit - for general API endpoints
     * Example: read operations, list endpoints
     */
    STANDARD: {
        limit: 100,
        window: 60,
        namespace: "standard",
    },

    /**
     * Generous rate limit - for high-volume endpoints
     * Example: search, autocomplete
     */
    GENEROUS: {
        limit: 1000,
        window: 60,
        namespace: "generous",
    },

    /**
     * Chat rate limit - for AI chat completions
     * Uses token bucket for burst handling
     */
    CHAT: {
        limit: 50,
        window: 60,
        namespace: "chat",
    },

    /**
     * Upload rate limit - for file uploads
     * Very strict to prevent abuse (per hour)
     */
    UPLOAD: {
        limit: 10,
        window: 3600, // 1 hour
        namespace: "upload",
    },

    /**
     * Auth exchange rate limit - for token exchange endpoint
     * Strict to prevent token enumeration
     */
    AUTH_EXCHANGE: {
        limit: 10,
        window: 60,
        namespace: "auth_exchange",
    },

    /**
     * Guest auth rate limit - for guest session creation
     * Moderately strict to prevent session flooding
     */
    AUTH_GUEST: {
        limit: 20,
        window: 60,
        namespace: "guest_auth",
    },
} as const;

/**
 * Type helper for rate limit config
 */
export type RateLimitPreset = keyof typeof RATE_LIMITS;

/**
 * Get a rate limit configuration by preset name
 */
export function getRateLimitConfig(preset: RateLimitPreset) {
    return RATE_LIMITS[preset];
}
