/**
 * Session management for authentication
 * @module new-arch/lib/auth/session-manager
 */
import "server-only";

import type { JWTPayload } from "jose";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import {
    GUEST_COOKIE_NAME,
    GUEST_TOKEN_TTL_SECONDS,
    getGuestJwtSecret,
    getSecureCookieOptions,
    getSupabaseIssuer,
    getSupabaseJwtSecret,
    SESSION_COOKIE_NAME,
    SESSION_DURATION_SECONDS,
    SUPABASE_COOKIE_NAME,
    TOKEN_REFRESH_THRESHOLD_SECONDS,
} from "./config";
import type {
    AppSession,
    AppUser,
    SessionValidationResult,
    UserType,
} from "./types";

/** JWT verification options */
type JwtVerifyOptions = {
    audience?: string | string[];
    issuer?: string | string[];
};

/**
 * SessionManager handles all session operations.
 * Server-only, Edge-compatible using jose for JWT operations.
 */
export class SessionManager {
    private readonly supabaseSecret: Uint8Array | null;
    private readonly guestSecret: Uint8Array | null;

    constructor() {
        this.supabaseSecret = getSupabaseJwtSecret();
        this.guestSecret = getGuestJwtSecret();
    }

    /**
     * Get current session from cookies.
     * Priority: Supabase > Guest
     */
    async getSession(): Promise<AppSession | null> {
        // Check Supabase session first (authenticated users)
        const supabaseSession = await this.getSupabaseSession();
        if (supabaseSession) {
            return supabaseSession;
        }

        // Fall back to guest session
        return this.getGuestSession();
    }

    /**
     * Create a new session from access token.
     * Used during token exchange when cookie isn't readable yet.
     */
    async createSession(accessToken: string): Promise<AppSession | null> {
        if (!this.supabaseSecret) {
            return null;
        }

        const payload = await this.verifyJwt(accessToken, this.supabaseSecret, {
            audience: "authenticated",
            issuer: getSupabaseIssuer(),
        });

        if (!payload?.sub) {
            return null;
        }

        const user = this.buildUser(
            payload.sub,
            "regular",
            this.extractEmail(payload)
        );
        return this.buildSession(user, payload.exp);
    }

    /**
     * Create a guest session.
     */
    async createGuestSession(): Promise<AppSession | null> {
        if (!this.guestSecret) {
            return null;
        }

        const guestId = `guest:${crypto.randomUUID()}`;
        const now = Math.floor(Date.now() / 1000);
        const exp = now + GUEST_TOKEN_TTL_SECONDS;

        const token = await new SignJWT({
            sub: guestId,
            type: "guest",
            iat: now,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt(now)
            .setExpirationTime(exp)
            .sign(this.guestSecret);

        const cookieStore = await cookies();
        cookieStore.set(
            GUEST_COOKIE_NAME,
            token,
            getSecureCookieOptions(SESSION_DURATION_SECONDS)
        );

        const user = this.buildUser(guestId, "guest", null);
        return this.buildSession(user, exp);
    }

    /**
     * Destroy current session by clearing cookies.
     */
    async destroySession(): Promise<void> {
        const cookieStore = await cookies();

        cookieStore.delete(SESSION_COOKIE_NAME);
        cookieStore.delete(GUEST_COOKIE_NAME);
        cookieStore.delete(SUPABASE_COOKIE_NAME);
    }

    /**
     * Refresh session if nearing expiry.
     * Returns true if session was refreshed.
     */
    async refreshSession(): Promise<boolean> {
        const session = await this.getSession();
        if (!session) {
            return false;
        }

        const remainingSeconds = Math.floor(
            (session.expiresAt.getTime() - Date.now()) / 1000
        );

        if (remainingSeconds > TOKEN_REFRESH_THRESHOLD_SECONDS) {
            return false; // No refresh needed
        }

        // For guest sessions, create a new token
        if (session.user.type === "guest" && this.guestSecret) {
            await this.rotateGuestToken(session.user.id);
            return true;
        }

        // Supabase sessions are refreshed client-side
        return false;
    }

    /**
     * Validate current session.
     */
    async validateSession(): Promise<SessionValidationResult> {
        const cookieStore = await cookies();

        // Check for any session cookie
        const hasSupabase = cookieStore.has(SUPABASE_COOKIE_NAME);
        const hasGuest = cookieStore.has(GUEST_COOKIE_NAME);

        if (!(hasSupabase || hasGuest)) {
            return { valid: false, reason: "missing" };
        }

        const session = await this.getSession();

        if (!session) {
            return { valid: false, reason: "invalid" };
        }

        if (session.expiresAt < new Date()) {
            return { valid: false, reason: "expired" };
        }

        return { valid: true, session };
    }

    // Private methods

    private async getSupabaseSession(): Promise<AppSession | null> {
        if (!this.supabaseSecret) {
            return null;
        }

        const cookieStore = await cookies();
        const token = cookieStore.get(SUPABASE_COOKIE_NAME)?.value;
        if (!token) {
            return null;
        }

        const payload = await this.verifyJwt(token, this.supabaseSecret, {
            audience: "authenticated",
            issuer: getSupabaseIssuer(),
        });

        if (!payload?.sub) {
            return null;
        }

        const user = this.buildUser(
            payload.sub,
            "regular",
            this.extractEmail(payload)
        );
        return this.buildSession(user, payload.exp);
    }

    private async getGuestSession(): Promise<AppSession | null> {
        if (!this.guestSecret) {
            return null;
        }

        const cookieStore = await cookies();
        const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
        if (!token) {
            return null;
        }

        const payload = await this.verifyJwt(token, this.guestSecret);
        if (!payload?.sub || payload.type !== "guest") {
            return null;
        }

        const user = this.buildUser(payload.sub, "guest", null);
        return this.buildSession(user, payload.exp);
    }

    private async rotateGuestToken(guestId: string): Promise<void> {
        if (!this.guestSecret) {
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        const exp = now + GUEST_TOKEN_TTL_SECONDS;

        const token = await new SignJWT({
            sub: guestId,
            type: "guest",
            iat: now,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt(now)
            .setExpirationTime(exp)
            .sign(this.guestSecret);

        const cookieStore = await cookies();
        cookieStore.set(
            GUEST_COOKIE_NAME,
            token,
            getSecureCookieOptions(SESSION_DURATION_SECONDS)
        );
    }

    private async verifyJwt(
        token: string,
        secret: Uint8Array,
        options?: JwtVerifyOptions
    ): Promise<JWTPayload | null> {
        try {
            const { payload } = await jwtVerify(token, secret, {
                audience: options?.audience,
                issuer: options?.issuer,
            });
            return payload;
        } catch {
            return null;
        }
    }

    private extractEmail(payload: JWTPayload): string | null {
        if (typeof payload.email === "string") {
            return payload.email;
        }

        const metadata = payload.user_metadata;
        if (typeof metadata === "object" && metadata !== null) {
            const email = (metadata as Record<string, unknown>).email;
            if (typeof email === "string") {
                return email;
            }
        }

        return null;
    }

    private buildUser(
        id: string,
        type: UserType,
        email: string | null
    ): AppUser {
        return { id, type, email };
    }

    private buildSession(user: AppUser, exp?: number): AppSession {
        const expiresAt = exp
            ? new Date(exp * 1000)
            : new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

        return {
            id: crypto.randomUUID(),
            userId: user.id,
            email: user.email ?? null,
            expiresAt,
            user,
        };
    }
}

/** Singleton instance */
export const sessionManager = new SessionManager();

/** Convenience function for backward compatibility */
export function getAppSession(): Promise<AppSession | null> {
    return sessionManager.getSession();
}
