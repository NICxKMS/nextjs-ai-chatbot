import "server-only";

import type { ErrorCode } from "./codes";
import { ErrorCodes } from "./codes";
import { getErrorMessage } from "./messages";
import type { ErrorContext, ErrorSeverity, SerializedError } from "./types";

export class AppError extends Error {
    readonly code: ErrorCode;
    readonly severity: ErrorSeverity;
    readonly context: ErrorContext;
    readonly timestamp: Date;
    override readonly cause?: Error | undefined;

    constructor(
        code: ErrorCode,
        options?: {
            message?: string;
            severity?: ErrorSeverity;
            context?: ErrorContext;
            cause?: Error | undefined;
        }
    ) {
        const message = options?.message ?? getErrorMessage(code);
        super(message);

        this.name = "AppError";
        this.code = code;
        this.severity = options?.severity ?? "error";
        this.context = options?.context ?? {};
        this.timestamp = new Date();
        this.cause = options?.cause;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace?.(this, AppError);
    }

    // HTTP status code mapping
    get statusCode(): number {
        switch (this.code) {
            case ErrorCodes.AUTH_REQUIRED:
            case ErrorCodes.AUTH_INVALID_TOKEN:
            case ErrorCodes.AUTH_SESSION_EXPIRED:
                return 401;
            case ErrorCodes.CHAT_ACCESS_DENIED:
                return 403;
            case ErrorCodes.CHAT_NOT_FOUND:
            case ErrorCodes.MESSAGE_NOT_FOUND:
            case ErrorCodes.NOT_FOUND:
                return 404;
            case ErrorCodes.AI_RATE_LIMITED:
                return 429;
            case ErrorCodes.VALIDATION_ERROR:
            case ErrorCodes.BAD_REQUEST:
            case ErrorCodes.CHAT_INVALID_ID:
            case ErrorCodes.MESSAGE_EMPTY:
                return 400;
            default:
                return 500;
        }
    }

    // Serialize for API responses
    toJSON(): SerializedError {
        const hasContext = Object.keys(this.context).length > 0;
        return {
            code: this.code,
            message: this.message,
            severity: this.severity,
            ...(hasContext && { context: this.context }),
            timestamp: this.timestamp.toISOString(),
        };
    }

    // Create from unknown error
    static from(
        error: unknown,
        fallbackCode: ErrorCode = ErrorCodes.INTERNAL_ERROR
    ): AppError {
        if (error instanceof AppError) {
            return error;
        }

        if (error instanceof Error) {
            return new AppError(fallbackCode, {
                message: error.message,
                cause: error,
            });
        }

        return new AppError(fallbackCode, {
            message: String(error),
        });
    }

    // Factory methods for common errors
    static authRequired(context?: ErrorContext): AppError {
        return new AppError(
            ErrorCodes.AUTH_REQUIRED,
            context ? { context } : undefined
        );
    }

    static notFound(resource: string, context?: ErrorContext): AppError {
        return new AppError(ErrorCodes.NOT_FOUND, {
            message: `${resource} not found`,
            ...(context && { context }),
        });
    }

    static validation(message: string, context?: ErrorContext): AppError {
        return new AppError(ErrorCodes.VALIDATION_ERROR, {
            message,
            ...(context && { context }),
        });
    }
}

/**
 * Alias for AppError - used by SDK components
 */
export const ChatSDKError = AppError;
export type ChatSDKError = AppError;
