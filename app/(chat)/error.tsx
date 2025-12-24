/**
 * Chat Error Boundary
 *
 * Handles errors that occur during chat rendering.
 * Provides user-friendly error message and retry option.
 *
 * @module app/(chat)/error
 */

"use client";

import { ErrorFallback } from "@/shared/components";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex h-full flex-col items-center justify-center">
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
