/**
 * Chat Error Boundary
 *
 * Handles errors that occur during chat rendering.
 * Provides user-friendly error message and retry option.
 *
 * @module app/(chat)/error
 */

"use client";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <h2 className="mb-2 font-semibold text-xl">Something went wrong</h2>
            <p className="mb-4 text-muted-foreground">{error.message}</p>
            <button
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
                onClick={reset}
            >
                Try again
            </button>
        </div>
    );
}
