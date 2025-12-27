/**
 * Error Handling Types
 * Ref: 01-error-handling-optimal-design.md §3
 */

export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

export type ErrorCategory =
    | "auth"
    | "validation"
    | "resource"
    | "rate_limit"
    | "external"
    | "internal";

export type ErrorCode = `${ErrorCategory}:${string}`;

export type AppErrorOptions = {
    code: ErrorCode;
    message?: string;
    severity?: ErrorSeverity;
    statusCode?: number;
    isOperational?: boolean;
    context?: Record<string, unknown>;
    cause?: unknown;
};

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: { code: ErrorCode; message: string } };

export type MessageConfig = {
    default: string;
    guest?: string;
    variants?: Record<string, string>;
};

export type LogContext = {
    requestId?: string;
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: unknown;
};
