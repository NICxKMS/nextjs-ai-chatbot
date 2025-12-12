"use client";

import { Component, type ReactNode } from "react";

type ArtifactErrorBoundaryProps = {
    children: ReactNode;
    fallback?: ReactNode;
};

type ArtifactErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

/**
 * Error boundary for artifact rendering.
 * Catches errors in artifact content components (code, sheet, etc.)
 * and displays a fallback UI instead of crashing the entire chat view.
 */
export class ArtifactErrorBoundary extends Component<
    ArtifactErrorBoundaryProps,
    ArtifactErrorBoundaryState
> {
    constructor(props: ArtifactErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ArtifactErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error for debugging
        console.error("Artifact rendering error:", error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                    <div className="font-medium text-destructive text-sm">
                        Failed to render artifact
                    </div>
                    <p className="max-w-md text-center text-muted-foreground text-xs">
                        An error occurred while rendering this content. Try
                        refreshing the page or creating a new artifact.
                    </p>
                    {this.state.error && (
                        <code className="mt-2 max-w-full overflow-auto rounded bg-muted p-2 text-xs">
                            {this.state.error.message}
                        </code>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
