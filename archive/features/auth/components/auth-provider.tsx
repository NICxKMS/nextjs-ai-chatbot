"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { AppSession } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/auth/client";
import type { AuthContextValue } from "../types";

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Helper Functions (P2-029: Extract logic into < 50 line helpers)
// ============================================================================

/**
 * Transform Supabase session to AppSession format
 * Returns null if session or user is missing
 */
function transformToAppSession(
    supabaseSession: Session | null
): AppSession | null {
    if (!supabaseSession?.user) {
        return null;
    }

    const { user } = supabaseSession;
    return {
        user: {
            id: user.id,
            type: "regular",
            email: user.email ?? null,
        },
    };
}

/**
 * Handle auth state change events from Supabase
 * P2-030: Flattened to max 2 levels of nesting using early return
 */
function handleAuthStateChange(
    event: AuthChangeEvent,
    supabaseSession: Session | null,
    setSession: (session: AppSession | null) => void
): void {
    // Early return for sign out or missing session
    if (event === "SIGNED_OUT" || !supabaseSession) {
        setSession(null);
        return;
    }

    const appSession = transformToAppSession(supabaseSession);
    setSession(appSession);
}

/**
 * Build memoized auth context value
 */
function buildAuthContextValue(
    session: AppSession | null,
    isNewSession: boolean,
    setSession: (session: AppSession | null) => void,
    clearNewSessionFlag: () => void
): AuthContextValue {
    return {
        session,
        user: session?.user ?? null,
        isAuthenticated: session !== null,
        isGuest: session?.user?.type === "guest",
        isLoading: false, // Loading handled by AuthBootstrap
        isNewSession,
        setSession,
        clearNewSessionFlag,
    };
}

// ============================================================================
// AuthProvider Component (P2-029: Reduced to < 50 lines)
// Ref: oldapp/components/auth-provider.tsx
// ============================================================================

export type AuthProviderProps = {
    /** Initial session from server */
    initialSession: AppSession | null;
    children: ReactNode;
};

/**
 * React Context provider for authentication state
 * Manages session state and syncs with Supabase auth events
 */
export function AuthProvider({ initialSession, children }: AuthProviderProps) {
    const [session, setSession] = useState<AppSession | null>(initialSession);
    const [isNewSession, setIsNewSession] = useState(false);

    const clearNewSessionFlag = useCallback(() => setIsNewSession(false), []);

    // Subscribe to Supabase auth state changes
    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, supabaseSession: Session | null) =>
                handleAuthStateChange(event, supabaseSession, setSession)
        );
        return () => subscription.unsubscribe();
    }, []);

    const value = useMemo(
        () =>
            buildAuthContextValue(
                session,
                isNewSession,
                setSession,
                clearNewSessionFlag
            ),
        [session, isNewSession, clearNewSessionFlag]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// ============================================================================
// useAuth Hook
// ============================================================================

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return ctx;
}
