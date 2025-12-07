"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/auth/client";
import type { AppSession } from "@/lib/auth/session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
    session: AppSession | null;
    status: AuthStatus;
    setSession: (session: AppSession | null) => void;
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
        if (session) {
            return;
        }

        let cancelled = false;

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
                };

                if (!cancelled && data.user) {
                    setSession({ user: data.user });
                }
            } catch {
                // Swallow errors – guest bootstrap is best-effort.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [session]);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
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

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            status,
            setSession,
        }),
        [session, status]
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
