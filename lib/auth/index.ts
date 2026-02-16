/**
 * Authentication Module
 *
 * Barrel export for NextAuth.js v5 integration providing authentication
 * configuration, session helpers, guards, and type definitions.
 *
 * @module lib/auth
 */

import NextAuth from "next-auth"

import { authConfig } from "./config"

// =============================================================================
// NextAuth Instance
// =============================================================================

/**
 * NextAuth.js instance with configured handlers and helpers
 *
 * - `handlers`: HTTP handlers for API routes (GET, POST)
 * - `auth`: Session getter for server components and actions
 * - `signIn`: Sign in action for server actions
 * - `signOut`: Sign out action for server actions
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// =============================================================================
// Configuration Exports
// =============================================================================

export type { ExtendedUser, NextAuthConfig } from "./config"
export { authConfig } from "./config"

// =============================================================================
// Type Augmentation
// =============================================================================

/**
 * Augment next-auth types with custom user fields
 * This allows `session.user.id` to be properly typed
 */
declare module "next-auth" {
	/**
	 * Extended session user type with id field
	 */
	interface User {
		id: string
	}

	/**
	 * Session interface with extended user
	 */
	interface Session {
		user: User
	}
}

/**
 * Note: JWT type augmentation is handled internally by next-auth v5
 * The `id` field is added to the token via the jwt callback in config.ts
 */

// =============================================================================
// Session Utilities
// =============================================================================

export {
	type AppSession,
	// Types
	type AppSessionUser,
	type AppUserType,
	createSessionContext,
	getGuestId,
	getOrCreateGuestSession,
	// Session functions
	getSession,
	getSessionUser,
	getUserId,
	isAuthenticated,
	isGuest,
	isGuestId,
	requireAuthenticatedSession,
	requireSession,
} from "./session"

// =============================================================================
// Authorization Guards
// =============================================================================

export {
	type ChatResource,
	canAccessChat,
	canModifyChat,
	// Types
	type GuardOptions,
	// Guest guards
	isGuestSession,
	type OwnedResource,
	optionalAuth,
	// Authentication guards
	requireAuth,
	requireAuthAction,
	requireAuthenticatedUser,
	requireChatAccess,
	requireChatModification,
	requireNonGuest,
	// Authorization guards
	requireOwnership,
	// Higher-order guards
	withAuth,
	withOwnership,
} from "./guards"
