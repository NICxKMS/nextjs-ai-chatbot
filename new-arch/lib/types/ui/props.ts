/**
 * UI Component Props Types
 * @module lib/types/ui/props
 *
 * Common prop type definitions for React components.
 */

import type { ReactNode } from "react";

// =============================================================================
// LOADING STATE
// =============================================================================

/**
 * Common loading states for async operations
 */
export type LoadingState = "idle" | "loading" | "error" | "success";

/**
 * Extended loading state with data
 */
export type AsyncState<T, E = Error> =
    | { status: "idle"; data: null; error: null }
    | { status: "loading"; data: null; error: null }
    | { status: "success"; data: T; error: null }
    | { status: "error"; data: null; error: E };

// =============================================================================
// COMMON PROP TYPES
// =============================================================================

/**
 * Props with optional className
 */
export type WithClassName<T = object> = T & {
    /** Optional CSS class name */
    className?: string;
};

/**
 * Props with optional children
 */
export type WithChildren<T = object> = T & {
    /** React children */
    children?: ReactNode;
};

/**
 * Props with both className and children
 */
export type WithClassNameAndChildren<T = object> = WithClassName<T> &
    WithChildren<T>;

/**
 * Props with required children
 */
export type RequireChildren<T = object> = T & {
    /** React children (required) */
    children: ReactNode;
};

// =============================================================================
// FORM PROPS
// =============================================================================

/**
 * Common input props
 */
export type InputProps<T = string> = {
    /** Current value */
    value: T;
    /** Change handler */
    onChange: (value: T) => void;
    /** Disabled state */
    disabled?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Error message */
    error?: string;
};

/**
 * Controlled form field props
 */
export type FieldProps<T> = InputProps<T> & {
    /** Field name */
    name: string;
    /** Field label */
    label?: string;
    /** Required field */
    required?: boolean;
    /** Help text */
    helpText?: string;
};

// =============================================================================
// CALLBACK PROPS
// =============================================================================

/**
 * Props with onClick handler
 */
export type WithOnClick<T = object> = T & {
    /** Click handler */
    onClick?: () => void;
};

/**
 * Props with onClose handler
 */
export type WithOnClose<T = object> = T & {
    /** Close handler */
    onClose?: () => void;
};

/**
 * Props with onSubmit handler
 */
export type WithOnSubmit<T = object, R = void> = T & {
    /** Submit handler */
    onSubmit?: () => R | Promise<R>;
};

// =============================================================================
// LAYOUT PROPS
// =============================================================================

/**
 * Common size variants
 */
export type Size = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Common variant types
 */
export type Variant =
    | "default"
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive";

/**
 * Common orientation
 */
export type Orientation = "horizontal" | "vertical";

/**
 * Props with size
 */
export type WithSize<T = object> = T & {
    /** Size variant */
    size?: Size;
};

/**
 * Props with variant
 */
export type WithVariant<T = object> = T & {
    /** Style variant */
    variant?: Variant;
};

// =============================================================================
// DATA DISPLAY PROPS
// =============================================================================

/**
 * Props for empty state
 */
export type EmptyStateProps = WithClassName<{
    /** Empty state title */
    title?: string;
    /** Empty state description */
    description?: string;
    /** Action button */
    action?: ReactNode;
    /** Icon to display */
    icon?: ReactNode;
}>;

/**
 * Props for error state
 */
export type ErrorStateProps = WithClassName<{
    /** Error title */
    title?: string;
    /** Error message */
    message: string;
    /** Retry action */
    onRetry?: () => void;
}>;

/**
 * Props for loading state
 */
export type LoadingStateProps = WithClassName<{
    /** Loading message */
    message?: string;
    /** Show spinner */
    showSpinner?: boolean;
}>;
