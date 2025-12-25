"use client";

import { type ReactNode, useEffect, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";
import { logger } from "@/lib/utils/logger";
import { createGuestSession } from "../services/auth-api";
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
                const data = await createGuestSession();

                if (cancelled || !data) {
                    setIsBootstrapping(false);
                    return;
                }

                if (!cancelled && data.user) {
                    setSession({ user: data.user });
                }
            } catch (error) {
                // Guest bootstrap is best-effort, but log for visibility
                logger.warn("Auth bootstrap failed", {
                    operation: "authBootstrap",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
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
