/**
 * Authentication Types
 * Ref: 02-authentication-optimal-design.md §3
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

export interface GuestTokenPayload extends JWTPayload {
    sub: string; // 'guest:{uuid}'
    type: "guest";
    iat: number;
    exp: number;
}

export type JWTPayload = {
    sub: string;
    aud?: string | string[];
    iat?: number;
    exp?: number;
    [key: string]: unknown;
};
