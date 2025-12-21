/**
 * AppError - Unified Error Class
 * Ref: 01-error-handling-optimal-design.md §4
 */

import type {
    ErrorCode,
    ErrorSeverity,
    AppErrorOptions,
    ActionResult,
} from "./types";
import { getMessage } from "./messages";
import { inferStatusCode } from "./utils";

export class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly severity: ErrorSeverity;
    readonly isOperational: boolean;
    readonly context?: Record<string, unknown>;

    constructor(options: AppErrorOptions) {
        const message = options.message ?? getMessage(options.code);
        super(message);

        this.name = "AppError";
        this.code = options.code;
        this.statusCode = options.statusCode ?? inferStatusCode(options.code);
        this.severity = options.severity ?? "error";
        this.isOperational = options.isOperational ?? true;
        this.context = options.context;

        if (options.cause) {
            this.cause = options.cause;
        }

        // Capture stack trace
        Error.captureStackTrace?.(this, this.constructor);
    }

    toResponse(): Response {
        return Response.json(
            {
                error: {
                    code: this.code,
                    message: this.message,
                },
            },
            { status: this.statusCode }
        );
    }

    toActionResult<T>(): ActionResult<T> {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
            },
        };
    }
}
