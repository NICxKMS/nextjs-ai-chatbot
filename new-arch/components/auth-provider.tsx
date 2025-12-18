"use client";

/**
 * Auth Provider
 * Client-side authentication context with session management
 */

import type { ReactNode } from "react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { ChatSDKError } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

/** User type discriminator */
export type UserType = "guest" | "regular";

/** Application user representation (client-side version) */
export type AppUser = {
    readonly id: string;
    readonly type: UserType;
    readonly email?: string | null;
};

/** Application session for client-side auth context */
export type AppSession = {
    readonly user: AppUser;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
    session: AppSession | null;
    status: AuthStatus;
    /** True when this is a brand new session with no prior history */
    isNewSession: boolean;
    setSession: (session: AppSession | null) => void;
    /** Clear the isNewSession flag after first interaction */
    clearNewSessionFlag: () => void;
};

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

export type AuthProviderProps = {
    children: ReactNode;
    initialSession: AppSession | null;
};

// ============================================================================
// Provider
// ============================================================================

/**
 * AuthProvider - Manages authentication state on the client
 *
 * Features:
 * - Tracks session state from server-provided initial session
 * - Bootstraps guest sessions for anonymous users
 * - Supports session updates and new session tracking
 */
export function AuthProvider({ initialSession, children }: AuthProviderProps) {
    const [session, setSession] = useState<AppSession | null>(initialSession);
    // Track if this is a brand new session (no history to fetch)
    const [isNewSession, setIsNewSession] = useState(false);
    // Track bootstrap attempts to prevent duplicate requests
    const [bootstrapAttempted, setBootstrapAttempted] = useState(
        initialSession !== null
    );

    const status: AuthStatus = useMemo(() => {
        if (!session) {
            return "unauthenticated";
        }
        return "authenticated";
    }, [session]);

    // Bootstrap guest sessions for anonymous users via a dedicated API route.
    // This decouples guest creation from individual data routes (chat, history, etc.)
    // while keeping it non-blocking and low-latency on the client.
    useEffect(() => {
        if (session || bootstrapAttempted) {
            return;
        }

        let cancelled = false;
        setBootstrapAttempted(true);

        (async () => {
            try {
                const response = await fetch("/api/auth/guest", {
                    method: "POST",
                    credentials: "include",
                });

                if (!response.ok || cancelled) {
                    return;
                }

                const data = (await response.json()) as {
                    session?: AppSession | null;
                    isNewSession?: boolean;
                };

                if (!cancelled && data.session) {
                    setSession(data.session);
                    // Mark as new session to skip initial history fetch
                    if (data.isNewSession) {
                        setIsNewSession(true);
                    }
                }
            } catch {
                // Swallow errors – guest bootstrap is best-effort.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [session, bootstrapAttempted]);

    // Clear the new session flag when user creates their first chat
    const clearNewSessionFlag = useCallback(() => {
        setIsNewSession(false);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            status,
            isNewSession,
            setSession,
            clearNewSessionFlag,
        }),
        [session, status, isNewSession, clearNewSessionFlag]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access authentication context.
 *
 * @throws ChatSDKError if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new ChatSDKError("bad_request:ui:useAuth_outside_provider");
    }
    return context;
}
