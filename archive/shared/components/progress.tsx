/**
 * Progress Indicator Components
 *
 * Provides progress feedback for long-running operations.
 *
 * @module shared/components/progress
 */

"use client";

import { CheckCircle2Icon, CircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type ProgressStep = {
    id: string;
    label: string;
    status: "pending" | "active" | "complete" | "error";
    description?: string;
};

export type ProgressIndicatorProps = {
    /** Progress value (0-100) */
    value: number;
    /** Show percentage text */
    showPercentage?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional class names */
    className?: string;
    /** Label for accessibility */
    label?: string;
};

export type SteppedProgressProps = {
    /** Steps to display */
    steps: ProgressStep[];
    /** Current step index */
    currentStep: number;
    /** Orientation */
    orientation?: "horizontal" | "vertical";
    /** Additional class names */
    className?: string;
};

export type SpinnerProps = {
    /** Size in pixels */
    size?: number;
    /** Additional class names */
    className?: string;
    /** Label for accessibility */
    label?: string;
};

// =============================================================================
// PROGRESS BAR
// =============================================================================

/**
 * Linear progress bar indicator.
 *
 * @example
 * ```tsx
 * <ProgressIndicator value={75} showPercentage />
 * ```
 */
export function ProgressIndicator({
    value,
    showPercentage = false,
    size = "md",
    className,
    label = "Progress",
}: ProgressIndicatorProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    const sizeClasses = {
        sm: "h-1",
        md: "h-2",
        lg: "h-3",
    };

    // Aria attributes need to be numbers (not expressions) for some linters
    const ariaValueNow = Math.round(clampedValue);

    return (
        <div className={cn("w-full", className)}>
            <div
                aria-label={label}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={ariaValueNow}
                className={cn(
                    "w-full overflow-hidden rounded-full bg-muted",
                    sizeClasses[size]
                )}
                role="progressbar"
            >
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
            {showPercentage && (
                <span className="mt-1 block text-muted-foreground text-xs">
                    {ariaValueNow}%
                </span>
            )}
        </div>
    );
}

// =============================================================================
// STEPPED PROGRESS
// =============================================================================

/**
 * Multi-step progress indicator.
 *
 * @example
 * ```tsx
 * <SteppedProgress
 *   steps={[
 *     { id: '1', label: 'Upload', status: 'complete' },
 *     { id: '2', label: 'Process', status: 'active' },
 *     { id: '3', label: 'Complete', status: 'pending' }
 *   ]}
 *   currentStep={1}
 * />
 * ```
 */
export function SteppedProgress({
    steps,
    currentStep,
    orientation = "horizontal",
    className,
}: SteppedProgressProps) {
    const isHorizontal = orientation === "horizontal";

    return (
        <div
            aria-label="Progress steps"
            className={cn(
                "flex",
                isHorizontal ? "items-center gap-2" : "flex-col gap-4",
                className
            )}
            role="list"
        >
            {steps.map((step, index) => (
                <div
                    aria-current={index === currentStep ? "step" : undefined}
                    className={cn(
                        "flex items-center gap-2",
                        isHorizontal && index < steps.length - 1 && "flex-1"
                    )}
                    key={step.id}
                    role="listitem"
                >
                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        <StepIcon status={step.status} />
                        <span
                            className={cn(
                                "text-sm",
                                step.status === "active" &&
                                    "font-medium text-foreground",
                                step.status === "complete" &&
                                    "text-muted-foreground",
                                step.status === "pending" &&
                                    "text-muted-foreground",
                                step.status === "error" && "text-destructive"
                            )}
                        >
                            {step.label}
                        </span>
                    </div>

                    {/* Connector line (horizontal only) */}
                    {isHorizontal && index < steps.length - 1 && (
                        <div
                            className={cn(
                                "h-px flex-1 bg-border",
                                step.status === "complete" && "bg-primary"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Step icon based on status.
 */
function StepIcon({ status }: { status: ProgressStep["status"] }) {
    const baseClasses = "size-5";

    switch (status) {
        case "complete":
            return (
                <CheckCircle2Icon className={cn(baseClasses, "text-primary")} />
            );
        case "active":
            return (
                <Loader2Icon
                    className={cn(baseClasses, "animate-spin text-primary")}
                />
            );
        case "error":
            return (
                <CircleIcon className={cn(baseClasses, "text-destructive")} />
            );
        default:
            return (
                <CircleIcon
                    className={cn(baseClasses, "text-muted-foreground")}
                />
            );
    }
}

// =============================================================================
// SPINNER
// =============================================================================

/**
 * Simple loading spinner.
 *
 * @example
 * ```tsx
 * <Spinner size={24} label="Loading..." />
 * ```
 */
export function Spinner({
    size = 20,
    className,
    label = "Loading",
}: SpinnerProps) {
    return (
        <Loader2Icon
            aria-label={label}
            className={cn("animate-spin text-muted-foreground", className)}
            role="status"
            size={size}
        />
    );
}

// =============================================================================
// INDETERMINATE PROGRESS
// =============================================================================

export type IndeterminateProgressProps = {
    /** Additional class names */
    className?: string;
    /** Label for accessibility */
    label?: string;
};

/**
 * Indeterminate progress indicator for unknown duration operations.
 *
 * @example
 * ```tsx
 * <IndeterminateProgress label="Processing..." />
 * ```
 */
export function IndeterminateProgress({
    className,
    label = "Loading",
}: IndeterminateProgressProps) {
    return (
        <div
            aria-label={label}
            className={cn(
                "h-1 w-full overflow-hidden rounded-full bg-muted",
                className
            )}
            role="progressbar"
        >
            <div className="h-full w-1/3 animate-indeterminate rounded-full bg-primary" />
        </div>
    );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export type LoadingOverlayProps = {
    /** Show the overlay */
    isLoading: boolean;
    /** Loading message */
    message?: string;
    /** Blur the background */
    blur?: boolean;
    /** Additional class names */
    className?: string;
    /** Children to overlay */
    children?: React.ReactNode;
};

/**
 * Loading overlay that covers content while loading.
 *
 * @example
 * ```tsx
 * <LoadingOverlay isLoading={isLoading} message="Saving...">
 *   <Content />
 * </LoadingOverlay>
 * ```
 */
export function LoadingOverlay({
    isLoading,
    message,
    blur = false,
    className,
    children,
}: LoadingOverlayProps) {
    return (
        <div className={cn("relative", className)}>
            {children}
            {isLoading && (
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80",
                        blur && "backdrop-blur-sm"
                    )}
                >
                    <Spinner size={32} />
                    {message && (
                        <p className="text-muted-foreground text-sm">
                            {message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
