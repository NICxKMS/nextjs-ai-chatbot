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
    // Determine error type for user-friendly messaging
    const isNetworkError =
        error.message?.toLowerCase().includes("network") ||
        error.message?.toLowerCase().includes("fetch");

    const title = isNetworkError ? "Connection issue" : "Unable to load chat";

    const description = isNetworkError
        ? "Check your internet connection and try again."
        : "We encountered an issue loading this page. Your data is safe.";

    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <h2 className="mb-2 font-semibold text-xl">{title}</h2>
            <p className="mb-4 text-muted-foreground">{description}</p>
            {process.env.NODE_ENV === "development" && error.message && (
                <p className="mb-4 max-w-md text-muted-foreground/70 text-sm">
                    {error.message}
                </p>
            )}
            <button
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
                onClick={reset}
                type="button"
            >
                Try again
            </button>
        </div>
    );
}
