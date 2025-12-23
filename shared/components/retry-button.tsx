/**
 * Retry Button Component
 *
 * Provides a standardized retry button with loading state and configurable behavior.
 * Used for error recovery actions throughout the application.
 *
 * @module shared/components/retry-button
 */

"use client";

import { RefreshCwIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type RetryButtonProps = {
    /** Function to call when retry is triggered */
    onRetry: () => void | Promise<void>;
    /** Button label text */
    label?: string;
    /** Loading state label */
    loadingLabel?: string;
    /** Button variant */
    variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
    /** Button size */
    size?: "default" | "sm" | "lg" | "icon";
    /** Show icon */
    showIcon?: boolean;
    /** Disable the button */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
    /** Auto-retry count (0 = disabled) */
    autoRetryCount?: number;
    /** Delay between auto-retries in ms */
    autoRetryDelay?: number;
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Retry button with loading state and optional auto-retry.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <RetryButton onRetry={refetch} />
 *
 * // With custom label
 * <RetryButton
 *   onRetry={refetch}
 *   label="Reload data"
 *   loadingLabel="Reloading..."
 * />
 *
 * // As icon button
 * <RetryButton onRetry={refetch} size="icon" label="" />
 * ```
 */
export function RetryButton({
    onRetry,
    label = "Try again",
    loadingLabel = "Retrying...",
    variant = "default",
    size = "default",
    showIcon = true,
    disabled = false,
    className,
}: RetryButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRetry = useCallback(async () => {
        if (isLoading || disabled) {
            return;
        }

        setIsLoading(true);
        try {
            await onRetry();
        } finally {
            setIsLoading(false);
        }
    }, [onRetry, isLoading, disabled]);

    const isIconOnly = size === "icon" || !label;

    return (
        <Button
            className={cn(isLoading && "cursor-wait", className)}
            disabled={disabled || isLoading}
            onClick={handleRetry}
            size={size}
            type="button"
            variant={variant}
        >
            {showIcon && (
                <RefreshCwIcon
                    className={cn(
                        "size-4",
                        isLoading && "animate-spin",
                        !isIconOnly && "mr-2"
                    )}
                />
            )}
            {!isIconOnly && (isLoading ? loadingLabel : label)}
        </Button>
    );
}

// =============================================================================
// INLINE RETRY BUTTON (For compact layouts)
// =============================================================================

export type InlineRetryButtonProps = {
    /** Function to call when retry is triggered */
    onRetry: () => void | Promise<void>;
    /** Button label text */
    label?: string;
    /** Additional class names */
    className?: string;
};

/**
 * Compact inline retry button for use in tight spaces.
 *
 * @example
 * ```tsx
 * <p className="text-sm">
 *   Failed to load. <InlineRetryButton onRetry={refetch} />
 * </p>
 * ```
 */
export function InlineRetryButton({
    onRetry,
    label = "Retry",
    className,
}: InlineRetryButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRetry = useCallback(async () => {
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        try {
            await onRetry();
        } finally {
            setIsLoading(false);
        }
    }, [onRetry, isLoading]);

    return (
        <button
            className={cn(
                "inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline",
                isLoading && "cursor-wait opacity-70",
                className
            )}
            disabled={isLoading}
            onClick={handleRetry}
            type="button"
        >
            <RefreshCwIcon
                className={cn("size-3", isLoading && "animate-spin")}
            />
            {isLoading ? "Retrying..." : label}
        </button>
    );
}
