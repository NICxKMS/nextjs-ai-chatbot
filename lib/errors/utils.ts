/**
 * Error Utilities
 * Ref: 01-error-handling-optimal-design.md §6
 */

import { AppError } from "./app-error";
import type { ErrorCategory, ErrorCode } from "./types";

/**
 * P4-043: Strategy pattern - Category to status code mapping.
 * Base status codes per error category.
 */
const CATEGORY_STATUS_MAP: Record<ErrorCategory, number> = {
    auth: 401,
    validation: 400,
    resource: 403,
    rate_limit: 429,
    external: 503,
    internal: 500,
};

/**
 * Infer HTTP status code from error code.
 * P4-043: Uses lookup table with special case handling.
 */
export function inferStatusCode(code: ErrorCode): number {
    const category = code.split(":")[0] as ErrorCategory;
    const baseStatus = CATEGORY_STATUS_MAP[category] ?? 500;

    // Special case overrides based on specific error codes
    if (category === "auth" && code.includes("forbidden")) {
        return 403;
    }
    if (category === "resource" && code.includes("not_found")) {
        return 404;
    }

    return baseStatus;
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Ensure error is an AppError, wrapping if necessary
 */
export function ensureAppError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError({
            code: "internal:unknown",
            message: error.message,
            cause: error,
            isOperational: false,
        });
    }

    return new AppError({
        code: "internal:unknown",
        message: String(error),
        isOperational: false,
    });
}

/**
 * Extract serializable error info for logging
 */
export function serializeError(error: unknown): Record<string, unknown> {
    if (isAppError(error)) {
        return {
            name: error.name,
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            severity: error.severity,
            isOperational: error.isOperational,
            context: error.context,
            stack: error.stack,
        };
    }

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return { value: String(error) };
}
