/**
 * API Error Types
 * @module lib/types/api/errors
 *
 * Type definitions for API errors.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Standard API error codes
 */
export type ApiErrorCode =
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR"
    | "SERVICE_UNAVAILABLE"
    | "TIMEOUT";

/**
 * HTTP status code mapping
 */
export const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 422,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    TIMEOUT: 504,
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Base API error structure
 */
export type ApiError = {
    /** Error code */
    code: ApiErrorCode;
    /** Human-readable message */
    message: string;
    /** Additional error details */
    details?: unknown;
    /** Request ID for tracking */
    requestId?: string;
};

/**
 * Validation error with field details
 */
export type ValidationError = ApiError & {
    code: "VALIDATION_ERROR";
    details: {
        /** Field-level errors */
        fields: Record<string, string[]>;
    };
};

/**
 * Rate limit error with retry info
 */
export type RateLimitError = ApiError & {
    code: "RATE_LIMITED";
    details: {
        /** Seconds until rate limit resets */
        retryAfter: number;
        /** Rate limit ceiling */
        limit: number;
        /** Remaining requests */
        remaining: number;
    };
};

/**
 * Authentication error
 */
export type AuthError = ApiError & {
    code: "UNAUTHORIZED" | "FORBIDDEN";
    details?: {
        /** Required permission */
        requiredPermission?: string;
        /** Reason for denial */
        reason?: string;
    };
};

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Create a standard API error
 */
export function createApiError(
    code: ApiErrorCode,
    message: string,
    details?: unknown
): ApiError {
    return {
        code,
        message,
        details,
    };
}

/**
 * Create a validation error
 */
export function createValidationError(
    fields: Record<string, string[]>
): ValidationError {
    return {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { fields },
    };
}

/**
 * Create a not found error
 */
export function createNotFoundError(resource: string, id?: string): ApiError {
    return {
        code: "NOT_FOUND",
        message: id
            ? `${resource} with ID '${id}' not found`
            : `${resource} not found`,
    };
}

/**
 * Create an unauthorized error
 */
export function createUnauthorizedError(
    message = "Authentication required"
): AuthError {
    return {
        code: "UNAUTHORIZED",
        message,
    };
}

/**
 * Create a forbidden error
 */
export function createForbiddenError(
    message = "Access denied",
    requiredPermission?: string
): AuthError {
    return {
        code: "FORBIDDEN",
        message,
        ...(requiredPermission && { details: { requiredPermission } }),
    };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if error is a validation error
 */
export function isValidationError(error: ApiError): error is ValidationError {
    return error.code === "VALIDATION_ERROR";
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: ApiError): error is RateLimitError {
    return error.code === "RATE_LIMITED";
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: ApiError): error is AuthError {
    return error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN";
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(error: ApiError): number {
    return ERROR_STATUS_MAP[error.code] ?? 500;
}
