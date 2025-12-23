/**
 * Error Fallback Components
 *
 * Provides consistent error state UI across the application.
 * Includes configurable messaging, icons, and retry actions.
 *
 * @module shared/components/error-fallback
 */

"use client";

import {
    AlertTriangleIcon,
    type LucideIcon,
    RefreshCwIcon,
    ServerCrashIcon,
    WifiOffIcon,
    XCircleIcon,
} from "lucide-react";
import { Component, type ReactNode, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type ErrorVariant =
    | "default"
    | "network"
    | "server"
    | "notFound"
    | "forbidden"
    | "validation";

export type ErrorFallbackProps = {
    /** Error object (optional) */
    error?: Error | null;
    /** Custom title override */
    title?: string;
    /** Custom description override */
    description?: string;
    /** Pre-defined variant for default styling */
    variant?: ErrorVariant;
    /** Custom icon (overrides variant icon) */
    icon?: LucideIcon;
    /** Retry callback */
    onRetry?: () => void | Promise<void>;
    /** Retry button label */
    retryLabel?: string;
    /** Secondary action */
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    /** Show error details in development */
    showDetails?: boolean;
    /** Additional class names */
    className?: string;
    /** Compact mode (less padding) */
    compact?: boolean;
    /** Custom children content */
    children?: ReactNode;
};

// =============================================================================
// VARIANT CONFIGURATION
// =============================================================================

const VARIANT_CONFIG: Record<
    ErrorVariant,
    {
        icon: LucideIcon;
        title: string;
        description: string;
        iconClassName: string;
    }
> = {
    default: {
        icon: AlertTriangleIcon,
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
        iconClassName: "text-destructive",
    },
    network: {
        icon: WifiOffIcon,
        title: "Connection issue",
        description: "Check your internet connection and try again.",
        iconClassName: "text-amber-500",
    },
    server: {
        icon: ServerCrashIcon,
        title: "Server error",
        description: "Our servers are having trouble. Please try again later.",
        iconClassName: "text-destructive",
    },
    notFound: {
        icon: XCircleIcon,
        title: "Not found",
        description: "The requested resource could not be found.",
        iconClassName: "text-muted-foreground",
    },
    forbidden: {
        icon: XCircleIcon,
        title: "Access denied",
        description: "You don't have permission to access this resource.",
        iconClassName: "text-destructive",
    },
    validation: {
        icon: AlertTriangleIcon,
        title: "Invalid data",
        description: "Please check your input and try again.",
        iconClassName: "text-amber-500",
    },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Infer error variant from error object.
 */
function inferVariant(error?: Error | null): ErrorVariant {
    if (!error) {
        return "default";
    }

    const message = error.message?.toLowerCase() ?? "";
    const name = error.name?.toLowerCase() ?? "";

    // Network errors
    if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("offline") ||
        name.includes("networkerror")
    ) {
        return "network";
    }

    // Server errors
    if (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("server")
    ) {
        return "server";
    }

    // Not found
    if (message.includes("404") || message.includes("not found")) {
        return "notFound";
    }

    // Forbidden
    if (
        message.includes("403") ||
        message.includes("forbidden") ||
        message.includes("unauthorized")
    ) {
        return "forbidden";
    }

    // Validation
    if (
        message.includes("validation") ||
        message.includes("invalid") ||
        name.includes("validationerror")
    ) {
        return "validation";
    }

    return "default";
}

// =============================================================================
// ERROR FALLBACK COMPONENT
// =============================================================================

/**
 * Generic error fallback component with retry capability.
 *
 * @example
 * ```tsx
 * // Basic usage with retry
 * <ErrorFallback
 *   error={error}
 *   onRetry={refetch}
 * />
 *
 * // Custom variant
 * <ErrorFallback
 *   variant="network"
 *   onRetry={refetch}
 *   retryLabel="Reconnect"
 * />
 *
 * // Compact mode for inline errors
 * <ErrorFallback
 *   error={error}
 *   compact
 *   onRetry={refetch}
 * />
 * ```
 */
export function ErrorFallback({
    error,
    title,
    description,
    variant,
    icon,
    onRetry,
    retryLabel = "Try again",
    secondaryAction,
    showDetails = process.env.NODE_ENV === "development",
    className,
    compact = false,
    children,
}: ErrorFallbackProps) {
    const [isRetrying, setIsRetrying] = useState(false);

    // Infer variant from error if not provided
    const effectiveVariant = variant ?? inferVariant(error);
    const config = VARIANT_CONFIG[effectiveVariant];

    // Use provided values or defaults from config
    const Icon = icon ?? config.icon;
    const displayTitle = title ?? config.title;
    const displayDescription = description ?? config.description;

    const handleRetry = useCallback(async () => {
        if (!onRetry || isRetrying) {
            return;
        }

        setIsRetrying(true);
        try {
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    }, [onRetry, isRetrying]);

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center",
                compact ? "gap-2 p-4" : "gap-4 p-8",
                className
            )}
            role="alert"
        >
            {/* Icon */}
            <div className={cn("rounded-full bg-muted p-3", compact && "p-2")}>
                <Icon
                    className={cn(
                        compact ? "size-5" : "size-8",
                        config.iconClassName
                    )}
                />
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
                <h3
                    className={cn(
                        "font-semibold",
                        compact ? "text-sm" : "text-lg"
                    )}
                >
                    {displayTitle}
                </h3>
                <p
                    className={cn(
                        "text-muted-foreground",
                        compact ? "text-xs" : "text-sm",
                        "max-w-md"
                    )}
                >
                    {displayDescription}
                </p>
            </div>

            {/* Error Details (development only) */}
            {showDetails && error?.message && (
                <code
                    className={cn(
                        "max-w-full overflow-auto rounded bg-muted px-2 py-1",
                        compact ? "text-[10px]" : "text-xs"
                    )}
                >
                    {error.message}
                </code>
            )}

            {/* Actions */}
            {(onRetry || secondaryAction) && (
                <div className={cn("flex gap-2", compact && "mt-1")}>
                    {onRetry && (
                        <Button
                            disabled={isRetrying}
                            onClick={handleRetry}
                            size={compact ? "sm" : "default"}
                            type="button"
                        >
                            <RefreshCwIcon
                                className={cn(
                                    "mr-2 size-4",
                                    isRetrying && "animate-spin"
                                )}
                            />
                            {isRetrying ? "Retrying..." : retryLabel}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            onClick={secondaryAction.onClick}
                            size={compact ? "sm" : "default"}
                            type="button"
                            variant="outline"
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}

            {/* Custom content */}
            {children}
        </div>
    );
}

// =============================================================================
// INLINE ERROR FALLBACK
// =============================================================================

export type InlineErrorFallbackProps = {
    /** Error message to display */
    message?: string;
    /** Retry callback */
    onRetry?: () => void | Promise<void>;
    /** Additional class names */
    className?: string;
};

/**
 * Compact inline error for use in lists or tight spaces.
 *
 * @example
 * ```tsx
 * <InlineErrorFallback
 *   message="Failed to load item"
 *   onRetry={refetch}
 * />
 * ```
 */
export function InlineErrorFallback({
    message = "Something went wrong",
    onRetry,
    className,
}: InlineErrorFallbackProps) {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
        if (!onRetry || isRetrying) {
            return;
        }

        setIsRetrying(true);
        try {
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    }, [onRetry, isRetrying]);

    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm",
                className
            )}
            role="alert"
        >
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <button
                    className={cn(
                        "inline-flex items-center gap-1 font-medium hover:underline",
                        isRetrying && "cursor-wait opacity-70"
                    )}
                    disabled={isRetrying}
                    onClick={handleRetry}
                    type="button"
                >
                    <RefreshCwIcon
                        className={cn("size-3", isRetrying && "animate-spin")}
                    />
                    {isRetrying ? "..." : "Retry"}
                </button>
            )}
        </div>
    );
}

// =============================================================================
// ERROR BOUNDARY WRAPPER
// =============================================================================

export type ErrorBoundaryProps = {
    /** Child components to render */
    children: ReactNode;
    /** Custom fallback component */
    fallback?: ReactNode;
    /** Fallback props (used with default ErrorFallback) */
    fallbackProps?: Omit<ErrorFallbackProps, "error" | "onRetry">;
    /** Called when error is caught */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

/**
 * Error boundary component with built-in retry capability.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallbackProps={{ variant: "server" }}
 *   onError={(error) => logError(error)}
 * >
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.props.onError?.(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default ErrorFallback with retry
            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={this.handleReset}
                    {...this.props.fallbackProps}
                />
            );
        }

        return this.props.children;
    }
}
