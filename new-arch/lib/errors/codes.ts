// Error codes organized by domain
export const ErrorCodes = {
    // Auth errors
    AUTH_REQUIRED: "AUTH_REQUIRED",
    AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
    AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",

    // Chat errors
    CHAT_NOT_FOUND: "CHAT_NOT_FOUND",
    CHAT_ACCESS_DENIED: "CHAT_ACCESS_DENIED",
    CHAT_INVALID_ID: "CHAT_INVALID_ID",

    // Message errors
    MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
    MESSAGE_EMPTY: "MESSAGE_EMPTY",

    // AI errors
    AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
    AI_RATE_LIMITED: "AI_RATE_LIMITED",
    AI_MODEL_UNAVAILABLE: "AI_MODEL_UNAVAILABLE",

    // Data errors
    DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",
    DB_QUERY_ERROR: "DB_QUERY_ERROR",

    // Validation errors
    VALIDATION_ERROR: "VALIDATION_ERROR",

    // Generic
    INTERNAL_ERROR: "INTERNAL_ERROR",
    NOT_FOUND: "NOT_FOUND",
    BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
