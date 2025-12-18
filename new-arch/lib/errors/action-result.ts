import "server-only";

import { AppError } from "./app-error";
import type { ErrorCode } from "./codes";
import type { SerializedError } from "./types";

// Discriminated union for Server Action results
export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: SerializedError };

// Helper to create success result
export function ok<T>(data: T): ActionResult<T> {
    return { success: true, data };
}

// Helper to create error result
export function err<T>(error: AppError | Error | string): ActionResult<T> {
    const appError =
        error instanceof AppError
            ? error
            : error instanceof Error
              ? AppError.from(error)
              : AppError.from(new Error(error));

    return { success: false, error: appError.toJSON() };
}

// Type guard
export function isOk<T>(
    result: ActionResult<T>
): result is { success: true; data: T } {
    return result.success === true;
}

export function isErr<T>(
    result: ActionResult<T>
): result is { success: false; error: SerializedError } {
    return result.success === false;
}

// Unwrap with error handling
export function unwrap<T>(result: ActionResult<T>): T {
    if (result.success === true) {
        return result.data;
    }
    const errorResult = result as { success: false; error: SerializedError };
    throw new AppError(errorResult.error.code as ErrorCode, {
        message: errorResult.error.message,
    });
}
