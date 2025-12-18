/**
 * Authentication module - barrel exports
 * @module new-arch/lib/auth
 */

// Config
export {
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
// Guards
export type { AuthResult } from "./guards";
export {
    optionalAuth,
    requireAuth,
    requireAuthForRoute,
    requireNonGuest,
    verifyOwnership,
    withAuth,
} from "./guards";
// Password utilities
export { hashPassword, verifyPassword } from "./password";
// Session Manager
export {
    getAppSession,
    SessionManager,
    sessionManager,
} from "./session-manager";
// Types
export type {
    AppSession,
    AppUser,
    AuthState,
    SessionJwtPayload,
    SessionValidationResult,
    UserType,
} from "./types";
