"use client";

import { AlertTriangleIcon, Code2Icon, RefreshCwIcon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { ErrorBoundary } from "@/shared/components";

// =============================================================================
// TYPES
// =============================================================================

export type ArtifactErrorBoundaryProps = {
    /** Child components to render */
    children: ReactNode;
    /** Custom fallback component */
    fallback?: ReactNode;
    /** Raw content to display if available */
    rawContent?: string;
};

// =============================================================================
// EDITOR ERROR FALLBACK
// =============================================================================

type EditorErrorFallbackProps = {
    /** The error that occurred */
    error: Error | null;
    /** Callback to reset the error boundary */
    resetErrorBoundary: () => void;
    /** Raw content to display if available */
    rawContent?: string;
};

function EditorErrorFallback({
    error,
    resetErrorBoundary,
    rawContent,
}: EditorErrorFallbackProps) {
    const [isRetrying, setIsRetrying] = useState(false);
    const [showRawContent, setShowRawContent] = useState(false);

    const handleRetry = useCallback(async () => {
        if (isRetrying) {
            return;
        }
        setIsRetrying(true);
        try {
            resetErrorBoundary();
        } finally {
            setIsRetrying(false);
        }
    }, [isRetrying, resetErrorBoundary]);

    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center gap-4 p-8"
            role="alert"
        >
            {/* Icon */}
            <div className="rounded-full bg-muted p-3">
                <AlertTriangleIcon className="size-8 text-destructive" />
            </div>

            {/* Title & Description */}
            <div className="space-y-1 text-center">
                <h3 className="font-semibold text-lg">Editor failed to load</h3>
                <p className="max-w-md text-muted-foreground text-sm">
                    The artifact editor encountered an error. You can try
                    reloading or view the raw content if available.
                </p>
            </div>

            {/* Error Details (development only) */}
            {error?.message && process.env.NODE_ENV === "development" && (
                <code className="max-w-full overflow-auto rounded bg-muted px-2 py-1 text-xs">
                    {error.message}
                </code>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    disabled={isRetrying}
                    onClick={handleRetry}
                    size="sm"
                    type="button"
                    variant="default"
                >
                    <RefreshCwIcon
                        className={cn(
                            "mr-2 size-4",
                            isRetrying && "animate-spin"
                        )}
                    />
                    {isRetrying ? "Retrying..." : "Retry"}
                </Button>

                {rawContent && (
                    <Button
                        onClick={() => setShowRawContent(!showRawContent)}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        <Code2Icon className="mr-2 size-4" />
                        {showRawContent ? "Hide Raw" : "View Raw"}
                    </Button>
                )}
            </div>

            {/* Raw Content View */}
            {showRawContent && rawContent && (
                <div className="mt-4 w-full max-w-2xl">
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
                        <code>{rawContent}</code>
                    </pre>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// ARTIFACT ERROR BOUNDARY
// =============================================================================

/**
 * Error boundary wrapper for artifact editor components.
 * Catches errors in artifact content components (code, sheet, text, etc.)
 * and displays a fallback UI with retry capability instead of crashing the app.
 *
 * @example
 * ```tsx
 * <ArtifactErrorBoundary rawContent={artifact.content}>
 *   <CodeEditor content={content} />
 * </ArtifactErrorBoundary>
 * ```
 */
export function ArtifactErrorBoundary({
    children,
    fallback,
    rawContent,
}: ArtifactErrorBoundaryProps) {
    const [boundaryKey, setBoundaryKey] = useState(0);

    const handleReset = useCallback(() => {
        setBoundaryKey((prev) => prev + 1);
    }, []);

    const handleError = useCallback(
        (error: Error, errorInfo: React.ErrorInfo) => {
            logger.error("[ArtifactEditor] Editor error caught", {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
            });
        },
        []
    );

    return (
        <ErrorBoundary
            fallback={
                fallback ?? (
                    <EditorErrorFallback
                        error={null}
                        rawContent={rawContent}
                        resetErrorBoundary={handleReset}
                    />
                )
            }
            key={boundaryKey}
            onError={handleError}
        >
            {children}
        </ErrorBoundary>
    );
}
