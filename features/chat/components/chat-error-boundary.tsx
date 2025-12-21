/**
 * Chat Error Boundary Component
 *
 * Catches and handles errors in the chat component tree,
 * providing a graceful fallback UI when errors occur.
 *
 * @module features/chat/components/chat-error-boundary
 */

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ChatErrorBoundaryProps {
    /** Child components to render */
    children: ReactNode;
    /** Optional custom fallback UI */
    fallback?: ReactNode;
}

interface ChatErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// =============================================================================
// ERROR FALLBACK COMPONENT
// =============================================================================

interface ChatErrorFallbackProps {
    error: Error | null;
    onRetry: () => void;
}

/**
 * Default error fallback UI for the chat.
 * Displays error information and a retry button.
 */
function ChatErrorFallback({ error, onRetry }: ChatErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-destructive mb-4">
                <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
                {error?.message || "An unexpected error occurred in the chat"}
            </p>
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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
