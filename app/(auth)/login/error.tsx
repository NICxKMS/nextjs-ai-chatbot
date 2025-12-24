/**
 * Login Error Boundary
 *
 * Handles errors that occur during login page rendering.
 * Provides user-friendly error message and retry option.
 *
 * @module app/(auth)/login/error
 */

"use client";

import { ErrorFallback } from "@/shared/components";

export default function LoginError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <ErrorFallback
                error={error}
                onRetry={reset}
                retryLabel="Try again"
                secondaryAction={{
                    label: "Go home",
                    onClick: () => {
                        window.location.href = "/";
                    },
                }}
            />
        </div>
    );
}
