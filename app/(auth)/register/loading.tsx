/**
 * Register Loading State
 *
 * Displays centered loading spinner while registration page loads.
 *
 * @module app/(auth)/register/loading
 */

import { Spinner } from "@/shared/components";

export default function RegisterLoading() {
    return (
        <div
            aria-label="Loading registration page"
            className="flex min-h-dvh items-center justify-center"
            role="status"
        >
            <div className="flex flex-col items-center gap-4">
                <Spinner label="Loading registration" size={32} />
                <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
        </div>
    );
}
