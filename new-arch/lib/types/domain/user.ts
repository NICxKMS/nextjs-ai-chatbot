/**
 * User Domain Types
 * @module lib/types/domain/user
 *
 * Type definitions for user and session entities.
 */

// =============================================================================
// USER TYPE
// =============================================================================

/**
 * User subscription/role type
 */
export type UserType = "guest" | "free" | "pro" | "admin";

// =============================================================================
// USER
// =============================================================================

/**
 * Core user entity
 */
export type User = {
    /** Unique user identifier (UUID) */
    id: string;
    /** User email address */
    email: string;
    /** User subscription type */
    type: UserType;
    /** Account creation timestamp */
    createdAt: Date;
    /** Last login timestamp */
    lastLogin?: Date;
};

/**
 * User profile with additional details
 */
export type UserProfile = User & {
    /** Display name */
    displayName?: string;
    /** Avatar URL */
    avatarUrl?: string;
    /** User preferences */
    preferences?: UserPreferences;
};

/**
 * User preferences configuration
 */
export type UserPreferences = {
    /** Preferred theme */
    theme?: "light" | "dark" | "system";
    /** Default chat visibility */
    defaultVisibility?: "public" | "private";
    /** Enable notifications */
    notifications?: boolean;
};

// =============================================================================
// SESSION
// =============================================================================

/**
 * Authentication session
 */
export type Session = {
    /** Authenticated user (null for guests) */
    user: User | null;
    /** Whether this is a guest session */
    isGuest: boolean;
    /** Session expiration timestamp */
    expiresAt?: Date;
};

/**
 * Authenticated session (guaranteed user)
 */
export type AuthenticatedSession = {
    user: User;
    isGuest: false;
    expiresAt?: Date;
};

/**
 * Guest session (no user)
 */
export type GuestSession = {
    user: null;
    isGuest: true;
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if session is authenticated
 */
export function isAuthenticated(
    session: Session
): session is AuthenticatedSession {
    return session.user !== null && !session.isGuest;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
    return user.type === "admin";
}

/**
 * Check if user has pro features
 */
export function hasProFeatures(user: User): boolean {
    return user.type === "pro" || user.type === "admin";
}
