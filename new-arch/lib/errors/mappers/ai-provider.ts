import "server-only";

import { AppError } from "../app-error";
import { ErrorCodes } from "../codes";

/**
 * Common AI provider error patterns
 */
const AI_ERROR_PATTERNS = {
    RATE_LIMIT: /rate.?limit|too.?many.?requests|quota.?exceeded/i,
    MODEL_UNAVAILABLE:
        /model.*(not.?found|unavailable|does.?not.?exist)|engine.?not.?found/i,
    INVALID_API_KEY:
        /invalid.?api.?key|unauthorized|authentication.?failed|incorrect.?api.?key/i,
    TIMEOUT: /timeout|timed?.?out|deadline.?exceeded/i,
    CONTENT_FILTER: /content.?filter|content.?policy|safety|moderation/i,
    CONTEXT_LENGTH: /context.?length|token.?limit|maximum.?context|too.?long/i,
    INVALID_REQUEST: /invalid.?request|bad.?request|malformed/i,
    SERVER_ERROR: /server.?error|internal.?error|service.?unavailable/i,
} as const;

type AIProviderError = {
    status?: number;
    statusCode?: number;
    code?: string;
    type?: string;
    message?: string;
};

function getStatusCode(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }
    const e = error as AIProviderError;
    return e.status ?? e.statusCode ?? null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    if (typeof error === "object" && error !== null) {
        return (error as AIProviderError).message ?? String(error);
    }
    return String(error);
}

/**
 * Maps AI SDK/provider errors to AppError
 */
export function mapAIProviderError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    const statusCode = getStatusCode(error);
    const message = getErrorMessage(error);
    const cause = error instanceof Error ? error : null;

    // Check by HTTP status code first
    if (statusCode === 429) {
        return new AppError(ErrorCodes.AI_RATE_LIMITED, {
            message: "AI provider rate limit exceeded. Please try again later.",
            context: { statusCode, retryable: true },
            ...(cause && { cause }),
        });
    }

    if (statusCode === 401 || statusCode === 403) {
        return new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: "AI provider authentication failed",
            severity: "fatal",
            context: { statusCode },
            ...(cause && { cause }),
        });
    }

    if (statusCode === 404) {
        return new AppError(ErrorCodes.AI_MODEL_UNAVAILABLE, {
            message: "Requested AI model not found",
            context: { statusCode },
            ...(cause && { cause }),
        });
    }

    if (statusCode === 503 || statusCode === 502) {
        return new AppError(ErrorCodes.AI_MODEL_UNAVAILABLE, {
            message: "AI provider temporarily unavailable",
            context: { statusCode, retryable: true },
            ...(cause && { cause }),
        });
    }

    // Check by error message patterns
    if (AI_ERROR_PATTERNS.RATE_LIMIT.test(message)) {
        return new AppError(ErrorCodes.AI_RATE_LIMITED, {
            message: "AI provider rate limit exceeded. Please try again later.",
            context: { retryable: true },
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.MODEL_UNAVAILABLE.test(message)) {
        return new AppError(ErrorCodes.AI_MODEL_UNAVAILABLE, {
            message: "Requested AI model is unavailable",
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.INVALID_API_KEY.test(message)) {
        return new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: "Invalid AI provider API key",
            severity: "fatal",
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.TIMEOUT.test(message)) {
        return new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: "AI provider request timed out",
            context: { retryable: true },
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.CONTENT_FILTER.test(message)) {
        return new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: "Content blocked by AI safety filters",
            context: { filtered: true },
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.CONTEXT_LENGTH.test(message)) {
        return new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: "Message exceeds model context length limit",
            ...(cause && { cause }),
        });
    }

    if (AI_ERROR_PATTERNS.INVALID_REQUEST.test(message)) {
        return new AppError(ErrorCodes.BAD_REQUEST, {
            message: "Invalid request to AI provider",
            ...(cause && { cause }),
        });
    }

    // Default: generic AI provider error
    return new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
        message: message || "AI provider error occurred",
        ...(statusCode && { context: { statusCode } }),
        ...(cause && { cause }),
    });
}
