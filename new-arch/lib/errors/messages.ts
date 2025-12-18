import "server-only";

import type { ErrorCode } from "./codes";
import { ErrorCodes } from "./codes";

// O(1) lookup message catalog
export const ErrorMessages: Record<ErrorCode, string> = {
    [ErrorCodes.AUTH_REQUIRED]: "Authentication required",
    [ErrorCodes.AUTH_INVALID_TOKEN]: "Invalid authentication token",
    [ErrorCodes.AUTH_SESSION_EXPIRED]: "Session has expired",

    [ErrorCodes.CHAT_NOT_FOUND]: "Chat not found",
    [ErrorCodes.CHAT_ACCESS_DENIED]: "Access denied to this chat",
    [ErrorCodes.CHAT_INVALID_ID]: "Invalid chat ID format",

    [ErrorCodes.MESSAGE_NOT_FOUND]: "Message not found",
    [ErrorCodes.MESSAGE_EMPTY]: "Message cannot be empty",

    [ErrorCodes.AI_PROVIDER_ERROR]: "AI provider error",
    [ErrorCodes.AI_RATE_LIMITED]: "Rate limit exceeded",
    [ErrorCodes.AI_MODEL_UNAVAILABLE]: "Model temporarily unavailable",

    [ErrorCodes.DB_CONNECTION_ERROR]: "Database connection error",
    [ErrorCodes.DB_QUERY_ERROR]: "Database query failed",

    [ErrorCodes.VALIDATION_ERROR]: "Validation failed",

    [ErrorCodes.INTERNAL_ERROR]: "Internal server error",
    [ErrorCodes.NOT_FOUND]: "Resource not found",
    [ErrorCodes.BAD_REQUEST]: "Bad request",
};

export function getErrorMessage(code: ErrorCode): string {
    return ErrorMessages[code] ?? ErrorMessages[ErrorCodes.INTERNAL_ERROR];
}
