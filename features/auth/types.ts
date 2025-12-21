/**
 * Auth Feature Types
 * Ref: 02-authentication-optimal-design.md §3
 */

import type { AppSession, AppUser } from "@/lib/auth";

/** Current authentication state */
export interface AuthState {
    user: AppUser | null;
    isAuthenticated: boolean;
    isGuest: boolean;
    isLoading: boolean;
}

/** Actions available for authentication */
export interface AuthActions {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

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
export interface AuthFormProps {
    mode: AuthFormMode;
    onSubmit: (formData: FormData) => void | Promise<void>;
    defaultEmail?: string;
    isLoading?: boolean;
    isSuccessful?: boolean;
}
