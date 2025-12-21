"use client";

import { type ReactNode, useEffect, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";
import type { AppSession } from "@/lib/auth";
import { useAuth } from "./auth-provider";

// ============================================================================
// AuthBootstrap Component
// Ref: oldapp/components/auth-provider.tsx (guest bootstrap logic)
// ============================================================================

export type AuthBootstrapProps = {
    children: ReactNode;
};

/**
 * Client component that bootstraps guest session if needed
 * Checks if user has session, if not calls /api/auth/guest
 * Renders children only after bootstrap is complete
 */
export function AuthBootstrap({ children }: AuthBootstrapProps) {
    const { session, setSession } = useAuth();
    const [isBootstrapping, setIsBootstrapping] = useState(session === null);
    const [bootstrapAttempted, setBootstrapAttempted] = useState(
        session !== null
    );

    useEffect(() => {
        // Skip if we already have a session or already attempted bootstrap
        if (session || bootstrapAttempted) {
            setIsBootstrapping(false);
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
                    setIsBootstrapping(false);
                    return;
                }

                const data = (await response.json()) as {
                    user?: AppSession["user"] | null;
                    isNewSession?: boolean;
                };

                if (!cancelled && data.user) {
                    setSession({ user: data.user });
                }
            } catch {
                // Swallow errors – guest bootstrap is best-effort
            } finally {
                if (!cancelled) {
                    setIsBootstrapping(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [session, bootstrapAttempted, setSession]);

    // Show loading spinner while bootstrapping
    if (isBootstrapping) {
        return (
            <div className="flex h-dvh w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="text-muted-foreground" size={32} />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
