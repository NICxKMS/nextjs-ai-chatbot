/**
 * Error Utilities
 * Ref: 01-error-handling-optimal-design.md §6
 */

import type { ErrorCode, ErrorCategory } from "./types";
import { AppError } from "./app-error";

/**
 * Infer HTTP status code from error code
 */
export function inferStatusCode(code: ErrorCode): number {
    const category = code.split(":")[0] as ErrorCategory;

    switch (category) {
        case "auth":
            return code.includes("forbidden") ? 403 : 401;
        case "validation":
            return 400;
        case "resource":
            return code.includes("not_found") ? 404 : 403;
        case "rate_limit":
            return 429;
        case "external":
            return 503;
        case "internal":
        default:
            return 500;
    }
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
