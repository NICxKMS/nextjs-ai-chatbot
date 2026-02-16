/**
 * Auth Feature Types
 *
 * Type definitions for the authentication feature module.
 *
 * @module features/auth/types
 */

import type { ReactNode } from "react"
import type { AppSession, AppSessionUser } from "@/lib/auth/session"

// =============================================================================
// Auth Status Types
// =============================================================================

/**
 * Authentication status
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for the AuthForm component
 */
export interface AuthFormProps {
	/** Form action - can be a URL string or a server action function */
	action: string | ((formData: FormData) => void | Promise<void>)
	/** Form submit button and additional content */
	children: ReactNode
	/** Default email value (for registration flow) */
	defaultEmail?: string
}

/**
 * Props for the AuthProvider component
 */
export interface AuthProviderProps {
	/** Initial session from server */
	initialSession: AppSession | null
	/** Child components */
	children: ReactNode
}

/**
 * Props for the ProtectedRoute component
 */
export interface ProtectedRouteProps {
	/** Content to render when authenticated */
	children: ReactNode
	/** Redirect path for unauthenticated users */
	redirectTo?: string
	/** Allow guest users */
	allowGuest?: boolean
	/** Loading component */
	fallback?: ReactNode
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * Value provided by the AuthContext
 */
export interface AuthContextValue {
	/** Current session */
	session: AppSession | null
	/** Auth status */
	status: AuthStatus
	/** Whether this is a brand new session */
	isNewSession: boolean
	/** Update session */
	setSession: (session: AppSession | null) => void
	/** Clear new session flag */
	clearNewSessionFlag: () => void
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Result of an authentication operation
 */
export interface AuthResult {
	/** Whether the operation was successful */
	success: boolean
	/** Error message if operation failed */
	error?: string
	/** Redirect URL after successful operation */
	redirectTo?: string
}

/**
 * Credentials for login
 */
export interface LoginCredentials {
	/** User email address */
	email: string
	/** User password */
	password: string
}

/**
 * Credentials for registration
 */
export interface RegisterCredentials extends LoginCredentials {
	/** Password confirmation */
	confirmPassword?: string
}

// =============================================================================
// User Types
// =============================================================================

/**
 * User information from auth context
 */
export interface AuthUser {
	/** User ID */
	id: string
	/** User email */
	email: string | null
	/** User type: regular (authenticated) or guest */
	type: "regular" | "guest"
}

// =============================================================================
// Re-exports from lib/auth
// =============================================================================

export type { AppSession, AppSessionUser }
