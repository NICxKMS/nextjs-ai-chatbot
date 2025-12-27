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
import { logger } from "@/lib/utils/logger";

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
    // Extract user-friendly message from error
    const errorMessage = error?.message || "An unexpected error occurred";
    const isNetworkError =
        errorMessage.toLowerCase().includes("network") ||
        errorMessage.toLowerCase().includes("fetch");

    const actionableMessage = isNetworkError
        ? "Check your internet connection and try again."
        : "The chat encountered an issue. Your messages are safe.";

    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 text-destructive">
                <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Unable to load chat</h2>
            <p className="mb-2 max-w-md text-muted-foreground">
                {actionableMessage}
            </p>
            {process.env.NODE_ENV === "development" && error && (
                <p className="mb-4 max-w-md text-muted-foreground text-sm">
                    {errorMessage}
                </p>
            )}
            <button
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={onRetry}
                type="button"
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
        logger.error("[ChatErrorBoundary] Caught error", { error });
        logger.error("[ChatErrorBoundary] Error info", { errorInfo });
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
