"use client";

/**
 * Error Context Component
 * React Context for centralized error state management.
 *
 * @module components/error-context
 * @see OPT-014
 */

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { toast } from "@/shared/ui/toast";

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorState {
    /** Unique identifier for this error */
    id: string;
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Error severity level */
    severity: ErrorSeverity;
    /** When the error occurred */
    timestamp: Date;
    /** Whether the error has been acknowledged */
    dismissed: boolean;
    /** Additional context data */
    context?: Record<string, unknown>;
    /** Whether this error is retryable */
    retryable?: boolean;
    /** Function to retry the failed operation */
    onRetry?: () => void;
}

export interface ErrorContextValue {
    /** Current list of active errors */
    errors: ErrorState[];
    /** Add a new error to the context */
    addError: (
        error: Omit<ErrorState, "id" | "timestamp" | "dismissed">
    ) => string;
    /** Remove an error by ID */
    removeError: (id: string) => void;
    /** Mark an error as dismissed (but keep in history) */
    dismissError: (id: string) => void;
    /** Clear all errors */
    clearErrors: () => void;
    /** Get the most recent error */
    latestError: ErrorState | null;
    /** Check if there are any undismissed errors */
    hasActiveErrors: boolean;
    /** Show error toast and add to context */
    showError: (
        message: string,
        options?: {
            code?: string;
            severity?: ErrorSeverity;
            context?: Record<string, unknown>;
            retryable?: boolean;
            onRetry?: () => void;
            showToast?: boolean;
        }
    ) => string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface ErrorProviderProps {
    children: ReactNode;
    /** Maximum number of errors to keep in history */
    maxErrors?: number;
    /** Whether to show toast notifications by default */
    showToasts?: boolean;
}

export function ErrorProvider({
    children,
    maxErrors = 50,
    showToasts = true,
}: ErrorProviderProps) {
    const [errors, setErrors] = useState<ErrorState[]>([]);

    const addError = useCallback(
        (error: Omit<ErrorState, "id" | "timestamp" | "dismissed">): string => {
            const id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const newError: ErrorState = {
                ...error,
                id,
                timestamp: new Date(),
                dismissed: false,
            };

            setErrors((prev) => {
                const updated = [newError, ...prev];
                // Keep only the most recent errors
                return updated.slice(0, maxErrors);
            });

            return id;
        },
        [maxErrors]
    );

    const removeError = useCallback((id: string) => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const dismissError = useCallback((id: string) => {
        setErrors((prev) =>
            prev.map((e) => (e.id === id ? { ...e, dismissed: true } : e))
        );
    }, []);

    const clearErrors = useCallback(() => {
        setErrors([]);
    }, []);

    const showError = useCallback(
        (
            message: string,
            options?: {
                code?: string;
                severity?: ErrorSeverity;
                context?: Record<string, unknown>;
                retryable?: boolean;
                onRetry?: () => void;
                showToast?: boolean;
            }
        ): string => {
            const {
                code = "error:unknown",
                severity = "error",
                context,
                retryable = false,
                onRetry,
                showToast = showToasts,
            } = options ?? {};

            const id = addError({
                code,
                message,
                severity,
                context,
                retryable,
                onRetry,
            });

            // Show toast notification
            if (showToast) {
                toast({
                    type:
                        severity === "info" || severity === "warning"
                            ? "error"
                            : "error",
                    description: message,
                });
            }

            return id;
        },
        [addError, showToasts]
    );

    const latestError = useMemo(
        () => errors.find((e) => !e.dismissed) ?? null,
        [errors]
    );

    const hasActiveErrors = useMemo(
        () => errors.some((e) => !e.dismissed),
        [errors]
    );

    const value = useMemo<ErrorContextValue>(
        () => ({
            errors,
            addError,
            removeError,
            dismissError,
            clearErrors,
            latestError,
            hasActiveErrors,
            showError,
        }),
        [
            errors,
            addError,
            removeError,
            dismissError,
            clearErrors,
            latestError,
            hasActiveErrors,
            showError,
        ]
    );

    return (
        <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access error context.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showError, hasActiveErrors } = useErrors();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitData();
 *     } catch (error) {
 *       showError("Failed to submit data", {
 *         code: "submit:failed",
 *         retryable: true,
 *         onRetry: handleSubmit,
 *       });
 *     }
 *   };
 *
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */
export function useErrors(): ErrorContextValue {
    const context = useContext(ErrorContext);

    if (context === undefined) {
        throw new Error("useErrors must be used within an ErrorProvider");
    }

    return context;
}

/**
 * Hook to get only error display state (lighter weight).
 */
export function useErrorDisplay() {
    const { errors, latestError, hasActiveErrors, dismissError } = useErrors();

    return {
        errors: errors.filter((e) => !e.dismissed),
        latestError,
        hasActiveErrors,
        dismissError,
    };
}

export { ErrorContext };
