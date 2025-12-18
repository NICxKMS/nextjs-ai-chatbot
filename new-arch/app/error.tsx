"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error to console in development
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-background px-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="font-semibold text-2xl text-foreground">
                    Something went wrong
                </h2>
                <p className="max-w-md text-muted-foreground">
                    An unexpected error occurred. Please try again or contact
                    support if the problem persists.
                </p>
                {error.digest && (
                    <p className="text-muted-foreground/60 text-xs">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
            <div className="flex gap-3">
                <Button onClick={reset} variant="default">
                    Try again
                </Button>
                <Button
                    onClick={() => {
                        window.location.href = "/";
                    }}
                    variant="outline"
                >
                    Go home
                </Button>
            </div>
        </div>
    );
}
