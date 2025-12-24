"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    // Log error digest for debugging
    console.debug("[GlobalError]", error.digest);

    return (
        <html lang="en">
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center text-foreground">
                    {/* Icon */}
                    <div className="mb-4 rounded-full bg-destructive/10 p-4">
                        <AlertTriangleIcon className="size-12 text-destructive" />
                    </div>

                    {/* Title & Description */}
                    <h1 className="mb-2 font-bold text-2xl">
                        Something went wrong
                    </h1>
                    <p className="mb-6 max-w-md text-muted-foreground">
                        An unexpected error occurred. Your data is safe. Please
                        try again or refresh the page.
                    </p>

                    {/* Error digest for support */}
                    {error.digest && (
                        <p className="mb-4 font-mono text-muted-foreground/60 text-xs">
                            Error ID: {error.digest}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            onClick={reset}
                            type="button"
                        >
                            <RefreshCwIcon className="size-4" />
                            Try again
                        </button>
                        <button
                            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                                window.location.href = "/";
                            }}
                            type="button"
                        >
                            Go home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
