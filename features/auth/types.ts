/**
 * Auth Feature Types
 * Ref: 02-authentication-optimal-design.md §3
 *
 * P3-019: Null object pattern - use EMPTY_AUTH_STATE
 * instead of null checks throughout the codebase.
 */

import type { AppSession, AppUser } from "@/lib/auth";

/** Current authentication state */
export type AuthState = {
    user: AppUser | null;
    isAuthenticated: boolean;
    isGuest: boolean;
    isLoading: boolean;
};

// =============================================================================
// NULL OBJECT PATTERNS (P3-019)
// =============================================================================

/**
 * Empty auth state for null object pattern.
 * Represents unauthenticated/initial state.
 */
export const EMPTY_AUTH_STATE: AuthState = {
    user: null,
    isAuthenticated: false,
    isGuest: false,
    isLoading: false,
} as const;

/**
 * Loading auth state for initialization.
 */
export const LOADING_AUTH_STATE: AuthState = {
    user: null,
    isAuthenticated: false,
    isGuest: false,
    isLoading: true,
} as const;

/** Actions available for authentication */
export type AuthActions = {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

/** Combined context value for AuthProvider */
export interface AuthContextValue extends AuthState {
    /** Current session object */
    session: AppSession | null;
    /** True when this is a brand new session with no prior history */
    isNewSession: boolean;
    /** Update session state */
    setSession: (session: AppSession | null) => void;
    /** Clear the isNewSession flag after first interaction */
    clearNewSessionFlag: () => void;
}

/** Form mode for AuthForm component */
export type AuthFormMode = "login" | "register";

/** Props for AuthForm component */
export type AuthFormProps = {
    mode: AuthFormMode;
    onSubmit: (formData: FormData) => void | Promise<void>;
    defaultEmail?: string;
    isLoading?: boolean;
    isSuccessful?: boolean;
};
