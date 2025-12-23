/**
 * Session Manager
 * Ref: 02-authentication-optimal-design.md §7
 *
 * CLN-004: Improved error handling with proper logging.
 */

import { createServerClient } from "@supabase/ssr";
import { nanoid } from "nanoid";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { logger } from "@/lib/utils/logger";
import {
    getGuestTokenCookie,
    getSupabaseCookieName,
    setGuestTokenCookie,
} from "./cookies";
import {
    createDeviceFingerprint,
    createGuestToken,
    needsRotation,
    validateDeviceFingerprint,
    verifyGuestToken,
} from "./jwt";
import {
    extractUserIdFromToken,
    getCachedSession,
    setCachedSession,
} from "./session-cache";
import type { AppSession, AppUser, DataContext } from "./types";

/**
 * SessionManager - Handles all session operations
 * Priority: Supabase session > Guest session
 *
 * Security features:
 * - Device fingerprinting (IP + User-Agent binding)
 * - Automatic token rotation on IP change
 * - User-Agent validation (strict)
 */
export class SessionManager {
    private static instance: SessionManager;

    private constructor() {}

    static getInstance(): SessionManager {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    /**
     * Extract device context from request headers
     * Works in Server Components, API routes, and middleware
     */
    private async getDeviceContext(): Promise<{
        ip: string | null;
        userAgent: string | null;
    }> {
        const headersList = await headers();

        // IP extraction priority: Vercel > x-forwarded-for > x-real-ip > null
        const ip =
            headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            headersList.get("x-real-ip") ||
            null;

        const userAgent = headersList.get("user-agent");

        return { ip, userAgent };
    }

    /**
     * Get current session from cookies with device validation
     * Returns null if no valid session or device mismatch
     */
    async getSession(): Promise<AppSession | null> {
        // Try Supabase session first
        const supabaseSession = await this.getSupabaseSession();
        if (supabaseSession) {
            return supabaseSession;
        }

        // Fall back to guest session with device validation
        return this.getGuestSession();
    }

    /**
     * Get Supabase session from cookie with caching
     *
     * Cache strategy (NET-002):
     * 1. Extract user ID from JWT (without verification) for cache key
     * 2. Check cache for validated session
     * 3. On cache miss, validate with Supabase and cache result
     */
    private async getSupabaseSession(): Promise<AppSession | null> {
        // Defer to request time - prevents prerender errors with cookies()
        await connection();

        try {
            const cookieStore = await cookies();

            // Try to extract user ID from Supabase cookie for cache lookup
            const authCookieName = getSupabaseCookieName();
            const authCookie = cookieStore.get(authCookieName)?.value;

            // Extract potential user ID for cache key
            let potentialUserId: string | null = null;
            if (authCookie) {
                // Supabase SSR stores session in chunked base64 or direct JWT
                // Try to extract the access_token JWT from the cookie value
                try {
                    // Check if it's a JSON session object
                    const decoded = JSON.parse(
                        Buffer.from(authCookie, "base64").toString("utf-8")
                    );
                    if (decoded.access_token) {
                        potentialUserId = extractUserIdFromToken(
                            decoded.access_token
                        );
                    }
                } catch (parseError) {
                    // CLN-004: May be direct JWT or other format, try direct extraction
                    logger.debug(
                        "[session] Cookie not JSON, trying direct JWT extraction",
                        {
                            error:
                                parseError instanceof Error
                                    ? parseError.message
                                    : "Unknown error",
                        }
                    );
                    potentialUserId = extractUserIdFromToken(authCookie);
                }
            }

            // Check cache if we have a potential user ID
            if (potentialUserId) {
                const cached = await getCachedSession(potentialUserId);
                if (cached) {
                    return cached;
                }
            }

            // Cache miss or no user ID - validate with Supabase
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll();
                        },
                        setAll() {
                            // Read-only in this context
                        },
                    },
                }
            );

            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                return null;
            }

            const appUser: AppUser = {
                id: user.id,
                type: "regular",
                email: user.email,
            };

            const session: AppSession = { user: appUser };

            // Cache the validated session
            await setCachedSession(user.id, session);

            return session;
        } catch (error) {
            // CLN-004: Log Supabase session errors for debugging
            logger.warn("[session] getSupabaseSession failed", {
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return null;
        }
    }

    /**
     * Get guest session from cookie with device validation
     *
     * Security: Validates device fingerprint to prevent session theft
     * - User-Agent mismatch = session rejected (different browser)
     * - IP change = session valid but token rotated (network change)
     */
    private async getGuestSession(): Promise<AppSession | null> {
        // Defer to request time - prevents prerender errors with cookies()
        await connection();

        const token = await getGuestTokenCookie();
        if (!token) {
            return null;
        }

        const payload = await verifyGuestToken(token);
        if (!payload) {
            return null;
        }

        // Validate device fingerprint
        const { ip, userAgent } = await this.getDeviceContext();
        const validation = await validateDeviceFingerprint(
            payload.fp,
            ip,
            userAgent
        );

        // User-Agent mismatch = potential session theft, reject
        if (!validation.valid) {
            // Don't delete cookie here - let it expire naturally
            // This prevents fingerprinting attacks via timing
            return null;
        }

        // IP changed = legitimate network change, rotate token
        if (validation.ipChanged && payload.fp) {
            const guestId = payload.sub.replace("guest:", "");
            const newFingerprint = await createDeviceFingerprint(ip, userAgent);
            const newToken = await createGuestToken(guestId, newFingerprint);
            await setGuestTokenCookie(newToken);
        }

        // Extract guest ID from 'guest:{uuid}' format
        const guestId = payload.sub.replace("guest:", "");

        const appUser: AppUser = {
            id: guestId,
            type: "guest",
        };

        return { user: appUser };
    }

    /**
     * Create a new guest session with device binding
     *
     * Security: Binds session to current device via fingerprint
     */
    async createGuestSession(): Promise<AppSession> {
        const guestId = nanoid();

        // Create device fingerprint for binding
        const { ip, userAgent } = await this.getDeviceContext();
        const fingerprint = await createDeviceFingerprint(ip, userAgent);

        const token = await createGuestToken(guestId, fingerprint);
        await setGuestTokenCookie(token);

        const appUser: AppUser = {
            id: guestId,
            type: "guest",
        };

        return { user: appUser };
    }

    /**
     * Get or create session (for initial page load)
     * Returns { session, isNew } to optimize client bootstrap
     */
    async getOrCreateSession(): Promise<{
        session: AppSession;
        isNew: boolean;
    }> {
        const existing = await this.getSession();

        if (existing) {
            return { session: existing, isNew: false };
        }

        const session = await this.createGuestSession();
        return { session, isNew: true };
    }

    /**
     * Rotate guest token if needed
     * Called from middleware for proactive rotation
     *
     * Security: Also rotates on IP change to bind to new device context
     */
    async rotateGuestTokenIfNeeded(): Promise<boolean> {
        const token = await getGuestTokenCookie();
        if (!token) {
            return false;
        }

        const payload = await verifyGuestToken(token);
        if (!payload) {
            return false;
        }

        // Check device fingerprint - validate and detect IP change
        const { ip, userAgent } = await this.getDeviceContext();
        const validation = await validateDeviceFingerprint(
            payload.fp,
            ip,
            userAgent
        );

        // User-Agent mismatch = don't rotate, let getSession reject it
        if (!validation.valid) {
            return false;
        }

        // Rotate if: time-based rotation needed OR IP changed
        const shouldRotate = needsRotation(payload) || validation.ipChanged;

        if (shouldRotate) {
            const guestId = payload.sub.replace("guest:", "");
            // Always use fresh fingerprint on rotation
            const fingerprint = await createDeviceFingerprint(ip, userAgent);
            const newToken = await createGuestToken(guestId, fingerprint);
            await setGuestTokenCookie(newToken);
            return true;
        }

        return false;
    }

    /**
     * Build DataContext from session
     */
    buildContext(session: AppSession, requestId?: string): DataContext {
        return {
            userId: session.user.id,
            userType: session.user.type,
            requestId,
        };
    }
}

/**
 * Get the singleton SessionManager instance
 */
export function getSessionManager(): SessionManager {
    return SessionManager.getInstance();
}

/**
 * Convenience function to get current session
 */
export async function getSession(): Promise<AppSession | null> {
    return getSessionManager().getSession();
}
