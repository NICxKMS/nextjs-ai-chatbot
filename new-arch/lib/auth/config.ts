/**
 * Authentication configuration constants
 * @module new-arch/lib/auth/config
 */

/** Cookie name for session storage */
export const SESSION_COOKIE_NAME = "app_session";

/** Supabase access token cookie name */
export const SUPABASE_COOKIE_NAME =
    process.env.SUPABASE_ACCESS_TOKEN_COOKIE_NAME || "sb-access-token";

/** Guest token cookie name */
export const GUEST_COOKIE_NAME = "guest_token";

/** Session duration in seconds (7 days) */
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

/** Token refresh threshold in seconds (1 hour before expiry) */
export const TOKEN_REFRESH_THRESHOLD_SECONDS = 60 * 60;

/** Guest token TTL in seconds (1 hour for security) */
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60;

/** Text encoder for secret encoding */
const encoder = new TextEncoder();

/** Get JWT secret as Uint8Array, returns null if not configured */
function getEncodedSecret(envVar: string | undefined): Uint8Array | null {
    return envVar ? encoder.encode(envVar) : null;
}

/** Get Supabase JWT secret */
export function getSupabaseJwtSecret(): Uint8Array | null {
    return getEncodedSecret(process.env.SUPABASE_JWT_SECRET);
}

/** Get Guest JWT secret */
export function getGuestJwtSecret(): Uint8Array | null {
    return getEncodedSecret(process.env.GUEST_JWT_SECRET);
}

/** Get Supabase issuer URL for JWT validation */
export function getSupabaseIssuer(): string | undefined {
    const url = process.env.SUPABASE_URL;
    return url ? `${url}/auth/v1` : undefined;
}

/** Secure cookie options for production */
export function getSecureCookieOptions(maxAge: number) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge,
    };
}
