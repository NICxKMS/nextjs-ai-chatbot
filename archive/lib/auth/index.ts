/**
 * Authentication Module - Public API
 * Ref: 02-authentication-optimal-design.md
 *
 * @module lib/auth
 */

import { cache } from "react";
import { getSession } from "./session";

/**
 * Request-scoped cached session getter.
 * Deduplicates session fetching within a single request.
 * Use this instead of getSession() for multiple calls in the same request.
 *
 * @see NET-001 Network Optimization
 */
export const getSessionCached = cache(async () => {
    return getSession();
});

// Client utilities
export { getSupabaseBrowserClient } from "./client";

// Constants
export {
    GUEST_CACHE_TTL_SECONDS,
    GUEST_TOKEN_COOKIE,
    getCookieOptions,
    isProductionEnvironment,
    JWT_EXPIRATION_SECONDS,
    ROTATION_THRESHOLD_SECONDS,
    SUPABASE_COOKIE_TTL_SECONDS,
} from "./constants";
// Cookie utilities
export {
    deleteGuestTokenCookie,
    getGuestTokenCookie,
    getSupabaseCookieName,
    setGuestTokenCookie,
} from "./cookies";
// Guest token extraction (SEC-003)
export { extractGuestIdFromToken, isGuestToken } from "./extract-guest";
// Guards
export {
    getOptionalAuth,
    isAuthResponse,
    requireAuth,
    requireAuthForRoute,
    requireRegularUser,
    verifyOwnership,
} from "./guards";
// JWT utilities
export {
    createDeviceFingerprint,
    createGuestToken,
    needsRotation,
    signJwt,
    validateDeviceFingerprint,
    verifyGuestToken,
    verifyJwt,
} from "./jwt";
// Session management
export { getSessionManager, SessionManager } from "./session";
// Session cache (NET-002)
export {
    extractUserIdFromToken,
    getCachedSession,
    invalidateCachedSession,
    setCachedSession,
} from "./session-cache";
export type {
    SessionMessage,
    SessionSyncInstance,
    SessionSyncOptions,
} from "./session-sync";
// Session sync (REQ-030 Multi-Tab Sync)
export {
    createSessionSync,
    useSessionSync,
    useSessionSyncBroadcast,
} from "./session-sync";
// Types
export type {
    AppSession,
    AppUser,
    AuthResult,
    AuthState,
    DataContext,
    DeviceFingerprint,
    GuestTokenPayload,
    JWTPayload,
    UserType,
} from "./types";
// Null object patterns (P3-019)
export {
    EMPTY_SESSION,
    EMPTY_USER,
    isEmptySession,
    isEmptyUser,
} from "./types";
