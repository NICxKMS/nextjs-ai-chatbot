/**
 * Authentication types for session management
 * @module new-arch/lib/auth/types
 */

/** User type discriminator */
export type UserType = "guest" | "regular";

/** Application user representation */
export type AppUser = {
    readonly id: string;
    readonly type: UserType;
    readonly email?: string | null;
};

/** Application session containing user data */
export type AppSession = {
    readonly id: string;
    readonly userId: string;
    readonly email: string | null;
    readonly expiresAt: Date;
    readonly user: AppUser;
};

/** Result of session validation */
export type SessionValidationResult =
    | { valid: true; session: AppSession }
    | { valid: false; reason: "expired" | "invalid" | "missing" };

/** JWT payload structure for session tokens */
export type SessionJwtPayload = {
    sub: string;
    type: UserType;
    email?: string | null;
    iat: number;
    exp: number;
};

/** Auth state for client-side usage */
export type AuthState =
    | { status: "loading" }
    | { status: "authenticated"; session: AppSession }
    | { status: "unauthenticated" };
