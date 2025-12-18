"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ChatErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

/**
 * Route-level error boundary for (chat) route group.
 * Catches runtime errors in chat pages and provides recovery options.
 */
export default function ChatError({ error, reset }: ChatErrorProps) {
    const router = useRouter();

    return (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 px-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="font-semibold text-xl">Something went wrong</h2>
                <p className="max-w-md text-muted-foreground text-sm">
                    An error occurred while loading this chat. You can try again
                    or return to the home page.
                </p>
                {error.digest && (
                    <p className="text-muted-foreground/60 text-xs">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
            <div className="flex gap-3">
                <Button onClick={() => router.push("/")} variant="outline">
                    Go Home
                </Button>
                <Button onClick={() => reset()}>Try Again</Button>
            </div>
        </div>
    );
}
