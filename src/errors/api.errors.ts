/**
 * API Error Classes
 * @module @/src/errors/api.errors
 *
 * Concrete error classes for API-related errors.
 * All extend AppError and include appropriate HTTP status codes.
 */

import { AppError, type ErrorContext } from "./base.error";

// ============================================================================
// Client Errors (4xx)
// ============================================================================

export class BadRequestError extends AppError {
	readonly code = "BAD_REQUEST" as const;
	readonly statusCode = 400 as const;

	constructor(
		message = "Bad request",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, options);
	}
}

export class UnauthorizedError extends AppError {
	readonly code: string = "UNAUTHORIZED";
	readonly statusCode = 401 as const;

	constructor(
		message = "Unauthorized",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, { ...options, shouldLog: false });
	}
}

export class ForbiddenError extends AppError {
	readonly code = "FORBIDDEN" as const;
	readonly statusCode = 403 as const;

	constructor(
		message = "Forbidden",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, options);
	}
}

export class NotFoundError extends AppError {
	readonly code: string = "NOT_FOUND";
	readonly statusCode = 404 as const;

	constructor(
		resource: string,
		identifier?: string | number,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		const message = identifier
			? `${resource} not found: ${identifier}`
			: `${resource} not found`;
		super(message, { ...options, shouldLog: false });
	}
}

export class ValidationError extends AppError {
	readonly code = "VALIDATION_ERROR" as const;
	readonly statusCode = 400 as const;
	readonly fieldErrors: Record<string, string[]>;

	constructor(
		message = "Validation failed",
		fieldErrors: Record<string, string[]> = {},
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, {
			...options,
			context: { ...options?.context, fieldErrors },
		});
		this.fieldErrors = fieldErrors;
	}
}

export class ConflictError extends AppError {
	readonly code: string = "CONFLICT";
	readonly statusCode = 409 as const;

	constructor(
		message = "Resource conflict",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, options);
	}
}

export class RateLimitError extends AppError {
	readonly code = "RATE_LIMITED" as const;
	readonly statusCode = 429 as const;
	readonly retryAfter?: number;

	constructor(
		message = "Too many requests",
		retryAfter?: number,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, {
			...options,
			context: { ...options?.context, retryAfter },
		});
		this.retryAfter = retryAfter;
	}
}

// ============================================================================
// Server Errors (5xx)
// ============================================================================

export class InternalError extends AppError {
	readonly code = "INTERNAL_ERROR" as const;
	readonly statusCode = 500 as const;

	constructor(
		message = "Internal server error",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, { ...options, isOperational: false });
	}
}

export class ServiceUnavailableError extends AppError {
	readonly code = "SERVICE_UNAVAILABLE" as const;
	readonly statusCode = 503 as const;

	constructor(
		service: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(`Service unavailable: ${service}`, options);
	}
}

// ============================================================================
// Domain-Specific Errors
// ============================================================================

export class ChatNotFoundError extends NotFoundError {
	override readonly code = "CHAT_NOT_FOUND" as const;

	constructor(
		chatId: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super("Chat", chatId, options);
	}
}

export class MessageNotFoundError extends NotFoundError {
	override readonly code = "MESSAGE_NOT_FOUND" as const;

	constructor(
		messageId: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super("Message", messageId, options);
	}
}

export class DocumentNotFoundError extends NotFoundError {
	override readonly code = "DOCUMENT_NOT_FOUND" as const;

	constructor(
		documentId: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super("Document", documentId, options);
	}
}

export class UserNotFoundError extends NotFoundError {
	override readonly code = "USER_NOT_FOUND" as const;

	constructor(
		userId: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super("User", userId, options);
	}
}

export class InvalidCredentialsError extends UnauthorizedError {
	override readonly code = "INVALID_CREDENTIALS" as const;

	constructor(options?: { cause?: Error; context?: ErrorContext }) {
		super("Invalid email or password", options);
	}
}

export class UserExistsError extends ConflictError {
	override readonly code = "USER_EXISTS" as const;

	constructor(
		email: string,
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(`User already exists: ${email}`, options);
	}
}

// ============================================================================
// Database Errors
// ============================================================================

export class DatabaseError extends AppError {
	readonly code: string = "DATABASE_ERROR";
	readonly statusCode = 500 as const;

	constructor(
		message = "Database operation failed",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, { ...options, isOperational: false });
	}
}

export class DatabaseConnectionError extends DatabaseError {
	override readonly code = "DATABASE_CONNECTION_ERROR" as const;

	constructor(options?: { cause?: Error; context?: ErrorContext }) {
		super("Failed to connect to database", options);
	}
}

// ============================================================================
// Cache Errors
// ============================================================================

export class CacheError extends AppError {
	readonly code = "CACHE_ERROR" as const;
	readonly statusCode = 500 as const;

	constructor(
		message = "Cache operation failed",
		options?: { cause?: Error; context?: ErrorContext },
	) {
		super(message, { ...options, shouldLog: true });
	}
}
