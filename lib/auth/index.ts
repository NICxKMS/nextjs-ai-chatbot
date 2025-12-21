/**
 * Authentication Module - Public API
 * Ref: 02-authentication-optimal-design.md
 *
 * @module lib/auth
 */

// Types
export type {
    UserType,
    AppUser,
    AppSession,
    AuthState,
    AuthResult,
    DataContext,
    GuestTokenPayload,
    JWTPayload,
} from "./types";

// Constants
export {
    GUEST_CACHE_TTL_SECONDS,
    JWT_EXPIRATION_SECONDS,
    ROTATION_THRESHOLD_SECONDS,
    SUPABASE_COOKIE_TTL_SECONDS,
    GUEST_TOKEN_COOKIE,
    getCookieOptions,
    isProductionEnvironment,
} from "./constants";

// JWT utilities
export {
    verifyJwt,
    signJwt,
    createGuestToken,
    verifyGuestToken,
    needsRotation,
} from "./jwt";

// Cookie utilities
export {
    getGuestTokenCookie,
    setGuestTokenCookie,
    deleteGuestTokenCookie,
    getSupabaseCookieName,
} from "./cookies";

// Session management
export { SessionManager, getSessionManager, getSession } from "./session";

// Guards
export {
    requireAuth,
    requireAuthForRoute,
    isAuthResponse,
    verifyOwnership,
    requireRegularUser,
    getOptionalAuth,
} from "./guards";

// Client utilities
export { getSupabaseBrowserClient } from "./client";
