export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
        process.env.PLAYWRIGHT ||
        process.env.CI_PLAYWRIGHT
);

// Matches guest IDs in format "guest:{uuid}" as created by session.ts
export const guestRegex =
    /^guest:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID validation regex (RFC 4122)
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID
 * @param value - String to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(value: string): boolean {
    return UUID_REGEX.test(value);
}

/**
 * Cache TTL constants
 */
export const GUEST_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
export const DEFAULT_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours in seconds

/**
 * Guest Token Security Constants (Task 7.6)
 *
 * Shorter JWT TTL with cookie-based rotation:
 * - JWT expires after 1 hour (enforced by jose verification)
 * - Cookie lasts 7 days (sliding window)
 * - When JWT expires, middleware creates new token with same guest ID
 * - This limits exposure if a token is leaked while maintaining UX
 */
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour JWT expiration
export const GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS = 30 * 60; // Rotate when < 30 mins left

/**
 * Default secure cookie configuration options.
 * Use this for consistent cookie settings across all auth-related cookies.
 *
 * @param maxAge - Optional max age in seconds (defaults to GUEST_CACHE_TTL_SECONDS)
 * @returns Cookie options object
 *
 * @example
 * ```typescript
 * cookieStore.set("my_cookie", value, getSecureCookieOptions());
 * cookieStore.set("session", token, getSecureCookieOptions(3600));
 * ```
 */
export function getSecureCookieOptions(maxAge?: number) {
    return {
        httpOnly: true,
        secure: isProductionEnvironment,
        path: "/",
        sameSite: "lax" as const,
        maxAge: maxAge ?? GUEST_CACHE_TTL_SECONDS,
    };
}

/**
 * Message loading limits
 */
export const MAX_MESSAGES_LIMIT = 1000; // Maximum messages to load per chat

/**
 * API pagination constants
 */
export const MAX_PAGINATION_LIMIT = 100; // Maximum items per page for list APIs
export const DEFAULT_PAGINATION_LIMIT = 10; // Default items per page

/**
 * API duration constants (Vercel Fluid Compute optimization)
 */
export const API_MAX_DURATION_SHORT = 10; // For fast APIs (history, vote, suggestions)
export const API_MAX_DURATION_MEDIUM = 30; // For upload APIs
export const API_MAX_DURATION_LONG = 60; // For streaming APIs (chat)

/**
 * Role ordering for consistent message sorting
 * Used when messages have the same timestamp
 */
export const ROLE_ORDER = {
    system: 0,
    user: 1,
    assistant: 2,
} as const;

/** Valid message role keys */
export type MessageRole = keyof typeof ROLE_ORDER;

/**
 * Sort messages by timestamp with role-based tiebreaker
 * Ensures consistent ordering when messages have the same timestamp
 */
export function sortMessagesByTimeAndRole<
    T extends { createdAt: Date | string; role: string },
>(messages: T[]): T[] {
    return [...messages].sort((a, b) => {
        const timeA =
            a.createdAt instanceof Date
                ? a.createdAt.getTime()
                : new Date(a.createdAt).getTime();
        const timeB =
            b.createdAt instanceof Date
                ? b.createdAt.getTime()
                : new Date(b.createdAt).getTime();
        if (timeA !== timeB) {
            return timeA - timeB;
        }
        // Role tiebreaker: system < user < assistant
        const roleA = a.role as MessageRole;
        const roleB = b.role as MessageRole;
        return (ROLE_ORDER[roleA] ?? 1) - (ROLE_ORDER[roleB] ?? 1);
    });
}

/**
 * Calculate ZSET score with role-based microsecond offset
 * Used for atomic Redis operations to ensure correct message ordering
 */
export function getZScoreWithRoleOffset(createdAt: Date, role: string): number {
    const baseScore = createdAt.getTime();
    // Add microsecond offset based on role for deterministic ordering
    // system=0, user=100, assistant=200 microseconds
    const roleKey = role as MessageRole;
    const roleOffset = (ROLE_ORDER[roleKey] ?? 1) * 100;
    return baseScore + roleOffset / 1_000_000;
}
