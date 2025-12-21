/**
 * Chat Error Boundary (Dynamic Route)
 *
 * Handles errors that occur during chat rendering.
 * Provides user-friendly error message and retry option.
 *
 * @module app/(chat)/chat/[id]/error
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
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
                Try again
            </button>
        </div>
    );
}
