/**
 * Authentication module - Public API
 * @module lib/auth
 */

// Types
export type {
  AppSession,
  AppUser,
  UserType,
  AuthState,
  JwtPayload,
} from './types';

// Session management
export { SessionManager, sessionManager, getAppSession } from './session';

// JWT utilities
export { verifyJwt, signJwt, type JwtVerifyOptions } from './jwt';

// Guards for server actions (throw)
export {
  requireAuth,
  verifyOwnership,
  requireNonGuest,
  requireResource,
} from './guards';

// Guards for API routes (return Response)
export {
  requireAuthForRoute,
  verifyOwnershipForRoute,
  requireNonGuestForRoute,
  requireResourceForRoute,
  isResponse,
} from './guards';

// Types from guards
export type { Surface, AuthResult } from './guards';

// Client
export { getSupabaseBrowserClient } from './client';

// Cookie configuration
export { COOKIE_NAMES, COOKIE_OPTIONS } from './cookies';
