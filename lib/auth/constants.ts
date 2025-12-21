/**
 * Authentication Constants
 * Ref: 02-authentication-optimal-design.md §4
 *
 * Extracted from OldApp: oldapp/lib/auth/session.ts
 */

/** Cookie TTL in seconds (7 days) */
export const GUEST_CACHE_TTL_SECONDS = 604800;

/** JWT expiration in seconds (1 hour) */
export const JWT_EXPIRATION_SECONDS = 3600;

/** Rotation threshold in seconds (30 minutes) */
export const ROTATION_THRESHOLD_SECONDS = 1800;

/** Supabase cookie TTL in seconds (1 hour) */
export const SUPABASE_COOKIE_TTL_SECONDS = 3600;

/** Guest token cookie name */
export const GUEST_TOKEN_COOKIE = "guest_token";

/** Default issuer for JWT */
export const JWT_ISSUER = "nextjs-ai-chatbot";

/**
 * Get cookie options based on environment
 */
export function getCookieOptions(isProduction: boolean) {
    return {
        httpOnly: true,
        secure: isProduction,
        path: "/",
        sameSite: "lax" as const,
        maxAge: GUEST_CACHE_TTL_SECONDS,
    };
}

/**
 * Check if running in production
 */
export function isProductionEnvironment(): boolean {
    return process.env.NODE_ENV === "production";
}
