/**
 * Chat Error Boundary Component
 *
 * Catches and handles errors in the chat component tree,
 * providing a graceful fallback UI when errors occur.
 *
 * @module features/chat/components/chat-error-boundary
 */

"use client";

import { AlertCircle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

// =============================================================================
// TYPES
// =============================================================================

type ChatErrorBoundaryProps = {
    /** Child components to render */
    children: ReactNode;
    /** Optional custom fallback UI */
    fallback?: ReactNode;
};

type ChatErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

// =============================================================================
// ERROR FALLBACK COMPONENT
// =============================================================================

type ChatErrorFallbackProps = {
    error: Error | null;
    onRetry: () => void;
};

/**
 * Default error fallback UI for the chat.
 * Displays error information and a retry button.
 */
function ChatErrorFallback({ error, onRetry }: ChatErrorFallbackProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 text-destructive">
                <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Something went wrong</h2>
            <p className="mb-4 max-w-md text-muted-foreground">
                {error?.message || "An unexpected error occurred in the chat"}
            </p>
            <button
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={onRetry}
            >
                Try again
            </button>
        </div>
    );
}

// =============================================================================
// ERROR BOUNDARY CLASS
// =============================================================================

/**
 * Error boundary for the chat component tree.
 *
 * @remarks
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and displays a fallback UI instead of crashing.
 *
 * @example
 * ```tsx
 * <ChatErrorBoundary>
 *   <ChatProvider>
 *     <ChatMessages />
 *   </ChatProvider>
 * </ChatErrorBoundary>
 * ```
 */
export class ChatErrorBoundary extends Component<
    ChatErrorBoundaryProps,
    ChatErrorBoundaryState
> {
    constructor(props: ChatErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error for debugging/monitoring
        console.error("[ChatErrorBoundary] Caught error:", error);
        console.error("[ChatErrorBoundary] Error info:", errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                this.props.fallback ?? (
                    <ChatErrorFallback
                        error={this.state.error}
                        onRetry={this.handleRetry}
                    />
                )
            );
        }

        return this.props.children;
    }
}
