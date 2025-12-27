/**
 * Register Error Boundary
 *
 * Handles errors that occur during registration page rendering.
 * Provides user-friendly error message and retry option.
 *
 * @module app/(auth)/register/error
 */

"use client";

import { ErrorFallback } from "@/shared/components";

export default function RegisterError({
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
