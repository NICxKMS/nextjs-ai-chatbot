"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { AppSession } from "@/lib/auth/session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
    session: AppSession | null;
    status: AuthStatus;
    /** True when this is a brand new session with no prior history */
    isNewSession: boolean;
    setSession: (session: AppSession | null) => void;
    /** Clear the isNewSession flag after first interaction */
    clearNewSessionFlag: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
    initialSession,
    children,
}: {
    initialSession: AppSession | null;
    children: ReactNode;
}) {
    const [session, setSession] = useState<AppSession | null>(initialSession);
    // Track if this is a brand new session (no history to fetch)
    const [isNewSession, setIsNewSession] = useState(false);
    // Task 7.10: Track bootstrap attempts to prevent duplicate requests
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
    // Task 7.10: Added bootstrapAttempted check to prevent duplicate requests
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
                    user?: AppSession["user"] | null;
                    isNewSession?: boolean;
                };

                if (!cancelled && data.user) {
                    setSession({ user: data.user });
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

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;

        (async () => {
            const { getSupabaseBrowserClient } = await import(
                "@/lib/auth/client"
            );
            const supabase = getSupabaseBrowserClient();

            const { data: authListener } = supabase.auth.onAuthStateChange(
                (event: AuthChangeEvent, supabaseSession: Session | null) => {
                    if (event === "SIGNED_OUT" || !supabaseSession) {
                        setSession(null);
                        return;
                    }

                    const user = supabaseSession.user;

                    if (!user) {
                        setSession(null);
                        return;
                    }

                    setSession({
                        user: {
                            id: user.id,
                            type: "regular",
                            email: user.email ?? null,
                        },
                    });
                }
            );
            subscription = authListener?.subscription ?? null;
        })();

        return () => {
            subscription?.unsubscribe();
        };
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

export function useAuth() {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return ctx;
}
