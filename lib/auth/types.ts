/**
 * Authentication Types
 * Ref: 02-authentication-optimal-design.md §3
 *
 * P3-019: Null object pattern - use EMPTY_USER and EMPTY_SESSION
 * instead of null checks throughout the codebase.
 */

export type UserType = "guest" | "regular";

export type AppUser = {
    id: string;
    type: UserType;
    email?: string | null;
};

export type AppSession = {
    user: AppUser;
};

// =============================================================================
// NULL OBJECT PATTERNS (P3-019)
// =============================================================================

/**
 * Empty user object for null object pattern.
 * Use instead of null checks: `user ?? EMPTY_USER`
 */
export const EMPTY_USER: AppUser = {
    id: "",
    type: "guest",
    email: null,
} as const;

/**
 * Empty session object for null object pattern.
 * Use instead of null checks: `session ?? EMPTY_SESSION`
 */
export const EMPTY_SESSION: AppSession = {
    user: EMPTY_USER,
} as const;

/**
 * Check if a user is the empty/null user object.
 */
export function isEmptyUser(user: AppUser): boolean {
    return user.id === "";
}

/**
 * Check if a session is the empty/null session object.
 */
export function isEmptySession(session: AppSession): boolean {
    return isEmptyUser(session.user);
}

export type AuthState =
    | { status: "loading" }
    | { status: "authenticated"; session: AppSession }
    | { status: "unauthenticated" };

export type AuthResult = {
    session: AppSession;
    ctx: DataContext;
};

export type DataContext = {
    userId: string;
    userType: UserType;
    requestId?: string;
};

/**
 * Device fingerprint for session binding
 * Hashes are SHA-256 truncated to 16 chars for compact storage
 */
export interface DeviceFingerprint {
    /** Hashed IP address (first 16 chars of SHA-256) */
    ipHash: string;
    /** Hashed User-Agent (first 16 chars of SHA-256) */
    uaHash: string;
}

export interface GuestTokenPayload extends JWTPayload {
    sub: string; // 'guest:{uuid}'
    type: "guest";
    iat: number;
    exp: number;
    /** Device fingerprint for binding validation */
    fp?: DeviceFingerprint;
}

export type JWTPayload = {
    sub: string;
    aud?: string | string[];
    iat?: number;
    exp?: number;
    [key: string]: unknown;
};
