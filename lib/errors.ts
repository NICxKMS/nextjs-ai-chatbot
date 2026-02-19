/**
 * Unified Error Handling System
 *
 * Provides typed error classes for consistent error handling across the application.
 * All errors can be converted to API response format for standardized client responses.
 *
 * @module lib/errors
 */

import type { ApiError, ApiResponse } from "@/lib/types"

// =============================================================================
// Error Code Constants
// =============================================================================

/**
 * Standard error codes used across the application.
 * Follows a DOMAIN_REASON naming convention.
 */
export const ErrorCodes = {
	// Validation errors (400)
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INVALID_INPUT: "INVALID_INPUT",
	MISSING_PARAMETER: "MISSING_PARAMETER",
	INVALID_FORMAT: "INVALID_FORMAT",

	// Authentication errors (401)
	UNAUTHORIZED: "UNAUTHORIZED",
	SESSION_EXPIRED: "SESSION_EXPIRED",
	INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

	// Authorization errors (403)
	FORBIDDEN: "FORBIDDEN",
	INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
	OWNER_MISMATCH: "OWNER_MISMATCH",

	// Not found errors (404)
	NOT_FOUND: "NOT_FOUND",
	CHAT_NOT_FOUND: "CHAT_NOT_FOUND",
	USER_NOT_FOUND: "USER_NOT_FOUND",
	MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
	ARTIFACT_NOT_FOUND: "ARTIFACT_NOT_FOUND",

	// Rate limiting errors (429)
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
	DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",

	// Server errors (500)
	INTERNAL_ERROR: "INTERNAL_ERROR",
	DATABASE_ERROR: "DATABASE_ERROR",
	CONFIGURATION_ERROR: "CONFIGURATION_ERROR",

	// Service unavailable (503)
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
	OFFLINE: "OFFLINE",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// =============================================================================
// AppError Base Class
// =============================================================================

/**
 * Base error class for all application errors.
 * Provides structured error information and API response conversion.
 *
 * @example
 * ```typescript
 * throw new AppError('VALIDATION_ERROR', 'Invalid email format', 400, {
 *   field: 'email',
 *   value: 'not-an-email'
 * });
 * ```
 */
export class AppError extends Error {
	/** Machine-readable error code */
	readonly code: ErrorCode | string
	/** HTTP status code */
	readonly statusCode: number
	/** Additional error context */
	readonly details: Record<string, unknown> | undefined
	/** Timestamp when error occurred */
	readonly timestamp: Date

	constructor(
		code: ErrorCode | string,
		message: string,
		statusCode: number,
		details?: Record<string, unknown>,
	) {
		super(message)
		this.name = "AppError"
		this.code = code
		this.statusCode = statusCode
		this.details = details
		this.timestamp = new Date()

		// Maintains proper stack trace in V8 environments
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor)
		}
	}

	/**
	 * Converts the error to an ApiError format for API responses.
	 *
	 * @returns ApiError object with code, message, details, and statusCode
	 */
	toApiError(): ApiError {
		return {
			code: this.code,
			message: this.message,
			statusCode: this.statusCode,
			...(this.details && { details: this.details }),
		}
	}

	/**
	 * Converts the error to an ApiResponse format.
	 *
	 * @template T - The expected success data type
	 * @returns ApiResponse with success: false and error information
	 */
	toApiResponse<T>(): ApiResponse<T> {
		return {
			success: false,
			error: this.toApiError(),
		}
	}

	/**
	 * Creates a JSON Response object suitable for API routes.
	 *
	 * @returns Response with JSON body containing error information
	 */
	toResponse(): Response {
		return Response.json(this.toApiError(), { status: this.statusCode })
	}

	/**
	 * Returns a JSON-serializable representation of the error.
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			statusCode: this.statusCode,
			...(this.details && { details: this.details }),
			timestamp: this.timestamp.toISOString(),
		}
	}
}

// =============================================================================
// Error Subclasses
// =============================================================================

/**
 * Validation error for input validation failures.
 * HTTP Status: 400 Bad Request
 *
 * @example
 * ```typescript
 * throw new ValidationError('Email is required', { field: 'email' });
 * ```
 */
export class ValidationError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(ErrorCodes.VALIDATION_ERROR, message, 400, details)
		this.name = "ValidationError"
	}
}

/**
 * Not found error for missing resources.
 * HTTP Status: 404 Not Found
 *
 * @example
 * ```typescript
 * throw new NotFoundError('Chat', chatId);
 * ```
 */
export class NotFoundError extends AppError {
	constructor(
		resource: string,
		identifier?: string,
		details?: Record<string, unknown>,
	) {
		const message = identifier
			? `${resource} not found: ${identifier}`
			: `${resource} not found`
		super(ErrorCodes.NOT_FOUND, message, 404, {
			resource,
			...(identifier && { identifier }),
			...details,
		})
		this.name = "NotFoundError"
	}
}

/**
 * Unauthorized error for authentication failures.
 * HTTP Status: 401 Unauthorized
 *
 * @example
 * ```typescript
 * throw new UnauthorizedError('Session expired');
 * ```
 */
export class UnauthorizedError extends AppError {
	constructor(
		message = "Authentication required",
		details?: Record<string, unknown>,
	) {
		super(ErrorCodes.UNAUTHORIZED, message, 401, details)
		this.name = "UnauthorizedError"
	}
}

/**
 * Forbidden error for authorization failures.
 * HTTP Status: 403 Forbidden
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('You do not have access to this chat');
 * ```
 */
export class ForbiddenError extends AppError {
	constructor(message = "Access denied", details?: Record<string, unknown>) {
		super(ErrorCodes.FORBIDDEN, message, 403, details)
		this.name = "ForbiddenError"
	}
}

/**
 * Rate limit error for throttling.
 * HTTP Status: 429 Too Many Requests
 *
 * @example
 * ```typescript
 * throw new RateLimitError('Daily message limit exceeded', { limit: 100, resetAt: tomorrow });
 * ```
 */
export class RateLimitError extends AppError {
	constructor(
		message = "Rate limit exceeded",
		details?: Record<string, unknown>,
	) {
		super(ErrorCodes.RATE_LIMIT_EXCEEDED, message, 429, details)
		this.name = "RateLimitError"
	}
}

/**
 * Internal server error for unexpected failures.
 * HTTP Status: 500 Internal Server Error
 *
 * @example
 * ```typescript
 * throw new InternalServerError('Database connection failed');
 * ```
 */
export class InternalServerError extends AppError {
	constructor(
		message = "An unexpected error occurred",
		details?: Record<string, unknown>,
	) {
		super(ErrorCodes.INTERNAL_ERROR, message, 500, details)
		this.name = "InternalServerError"
	}
}

/**
 * Service unavailable error for external service failures.
 * HTTP Status: 503 Service Unavailable
 *
 * @example
 * ```typescript
 * throw new ServiceUnavailableError('AI service is temporarily unavailable');
 * ```
 */
export class ServiceUnavailableError extends AppError {
	constructor(
		message = "Service temporarily unavailable",
		details?: Record<string, unknown>,
	) {
		super(ErrorCodes.SERVICE_UNAVAILABLE, message, 503, details)
		this.name = "ServiceUnavailableError"
	}
}

/**
 * User type for context-aware error messaging.
 */
export type ErrorUserType = "guest" | "regular" | "unknown"

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an error is an AppError instance.
 *
 * @param error - The error to check
 * @returns True if the error is an AppError
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (isAppError(error)) {
 *     return error.toApiResponse();
 *   }
 *   throw error;
 * }
 * ```
 */
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError
}

/**
 * Type guard to check if an error has a specific error code.
 *
 * @param error - The error to check
 * @param code - The error code to match
 * @returns True if the error is an AppError with the specified code
 */
export function hasErrorCode(
	error: unknown,
	code: ErrorCode | string,
): error is AppError {
	return isAppError(error) && error.code === code
}

// =============================================================================
// Error Helpers
// =============================================================================

/**
 * Converts an unknown error to an AppError.
 * Useful for catch blocks where the error type is unknown.
 *
 * @param error - The unknown error to convert
 * @param defaultMessage - Default message if error is not an Error
 * @returns An AppError instance
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   const appError = fromUnknownError(error, 'Operation failed');
 *   return appError.toApiResponse();
 * }
 * ```
 */
export function fromUnknownError(
	error: unknown,
	defaultMessage = "An unexpected error occurred",
): AppError {
	// Already an AppError - return as-is
	if (isAppError(error)) {
		return error
	}

	// Standard Error instance - wrap in InternalServerError
	if (error instanceof Error) {
		return new InternalServerError(error.message, {
			originalName: error.name,
			stack: error.stack,
		})
	}

	// Unknown error type - return generic error
	return new InternalServerError(defaultMessage, {
		originalError: String(error),
	})
}

/**
 * Creates a NotFoundError for a specific entity type.
 * Factory function for consistent not-found errors.
 *
 * @param entity - The entity type name (e.g., 'Chat', 'User')
 * @param id - The entity identifier
 * @returns NotFoundError instance
 */
export function createEntityNotFoundError(
	entity: string,
	id?: string,
): NotFoundError {
	const codeMap: Record<string, ErrorCode> = {
		Chat: ErrorCodes.CHAT_NOT_FOUND,
		User: ErrorCodes.USER_NOT_FOUND,
		Message: ErrorCodes.MESSAGE_NOT_FOUND,
		Artifact: ErrorCodes.ARTIFACT_NOT_FOUND,
	}

	const code = codeMap[entity] ?? ErrorCodes.NOT_FOUND
	const error = new NotFoundError(entity, id)
	// Override the code with the specific entity code
	;(error as { code: ErrorCode }).code = code
	return error
}

/**
 * Extracts error message from unknown error for logging.
 * Safe to use in error handlers.
 *
 * @param error - The unknown error
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown): string {
	if (isAppError(error)) {
		return error.message
	}
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

/**
 * Resolve user-facing message by error code with guest-aware overrides.
 * Supports both v6 `ErrorCodes` values and legacy `type:surface[:reason]` codes.
 */
export function getMessageByErrorCode(
	errorCode: ErrorCode | string,
	userType?: ErrorUserType,
): string {
	const normalizedCode = (() => {
		if (Object.values(ErrorCodes).includes(errorCode as ErrorCode)) {
			return errorCode as ErrorCode
		}

		if (errorCode.startsWith("not_found:chat")) {
			return ErrorCodes.CHAT_NOT_FOUND
		}
		if (errorCode.startsWith("not_found:")) {
			return ErrorCodes.NOT_FOUND
		}
		if (errorCode.includes("daily_limit")) {
			return ErrorCodes.DAILY_LIMIT_EXCEEDED
		}
		if (errorCode.startsWith("rate_limit:")) {
			return ErrorCodes.RATE_LIMIT_EXCEEDED
		}
		if (errorCode.startsWith("offline:")) {
			return ErrorCodes.OFFLINE
		}
		if (errorCode.startsWith("forbidden:")) {
			return ErrorCodes.FORBIDDEN
		}
		if (errorCode.startsWith("unauthorized:")) {
			return ErrorCodes.UNAUTHORIZED
		}
		if (errorCode.startsWith("bad_request:")) {
			return ErrorCodes.VALIDATION_ERROR
		}

		return ErrorCodes.INTERNAL_ERROR
	})()

	if (userType === "guest") {
		switch (normalizedCode) {
			case ErrorCodes.CHAT_NOT_FOUND:
				return "Chat not found. Guest chat history is temporary and may have expired. Sign in to save your chats permanently."
			case ErrorCodes.NOT_FOUND:
				return "The requested resource was not found. Guest data is temporary and may have expired. Sign in to save your data permanently."
			case ErrorCodes.RATE_LIMIT_EXCEEDED:
				return "You've reached the rate limit for guest users. Sign in to increase your rate limits."
			case ErrorCodes.DAILY_LIMIT_EXCEEDED:
				return "Daily message limit exceeded for guest users. Sign in to increase your message allowance."
			case ErrorCodes.SERVICE_UNAVAILABLE:
				return "Service temporarily unavailable. Guest sessions are stored temporarily. Sign in to ensure your data is saved."
			case ErrorCodes.OFFLINE:
				return "Connection lost. Guest sessions are temporary and may be lost. Sign in to ensure your chats are saved."
			case ErrorCodes.FORBIDDEN:
				return "Guest users have limited access to this feature. Sign in to access all features."
		}
	}

	switch (normalizedCode) {
		case ErrorCodes.VALIDATION_ERROR:
		case ErrorCodes.INVALID_INPUT:
		case ErrorCodes.MISSING_PARAMETER:
		case ErrorCodes.INVALID_FORMAT:
			return "Please check your input and try again."
		case ErrorCodes.UNAUTHORIZED:
		case ErrorCodes.SESSION_EXPIRED:
			return "Please sign in to continue."
		case ErrorCodes.FORBIDDEN:
			return "You don't have permission to access this resource."
		case ErrorCodes.CHAT_NOT_FOUND:
		case ErrorCodes.NOT_FOUND:
			return "The requested resource was not found."
		case ErrorCodes.RATE_LIMIT_EXCEEDED:
			return "Too many requests. Please wait and try again."
		case ErrorCodes.DAILY_LIMIT_EXCEEDED:
			return "Daily limit exceeded. Please try again later."
		case ErrorCodes.DATABASE_ERROR:
			return "A database error occurred. Please try again."
		case ErrorCodes.SERVICE_UNAVAILABLE:
			return "Service temporarily unavailable. Please try again later."
		case ErrorCodes.OFFLINE:
			return "You appear to be offline. Please check your connection."
		default:
			return "An unexpected error occurred. Please try again."
	}
}
