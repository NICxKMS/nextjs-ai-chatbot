/**
 * Login Loading State
 *
 * Displays centered loading spinner while login page loads.
 *
 * @module app/(auth)/login/loading
 */

import { Spinner } from "@/shared/components";

export default function LoginLoading() {
    return (
        <div
            aria-label="Loading login page"
            className="flex min-h-dvh items-center justify-center"
            role="status"
        >
            <div className="flex flex-col items-center gap-4">
                <Spinner label="Loading login" size={32} />
                <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
        </div>
    );
}
