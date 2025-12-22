/**
 * Authentication Module - Public API
 * Ref: 02-authentication-optimal-design.md
 *
 * @module lib/auth
 */

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
export { getSession, getSessionManager, SessionManager } from "./session";
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
