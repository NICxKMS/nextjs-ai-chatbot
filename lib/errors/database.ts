/**
 * Database Error Handling Utilities
 *
 * Provides specialized error handling for PostgreSQL database errors,
 * mapping Postgres error codes to typed AppError instances.
 *
 * @module lib/errors/database
 */

import {
	AppError,
	type ErrorCode,
	ErrorCodes,
	InternalServerError,
	NotFoundError,
	ValidationError,
} from "@/lib/errors"

// =============================================================================
// Postgres Error Types
// =============================================================================

/**
 * PostgreSQL error shape for type-safe error handling.
 * Based on postgres.js and Drizzle ORM error structures.
 *
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export interface PostgresError {
	/** PostgreSQL error code (5-character string) */
	readonly code?: string
	/** Human-readable error message */
	readonly message?: string
	/** Detailed error description */
	readonly detail?: string
	/** Constraint name for constraint violations */
	readonly constraint?: string
	/** Table name where error occurred */
	readonly table?: string
	/** Column name for column-specific errors */
	readonly column?: string
	/** Schema name */
	readonly schema?: string
}

/**
 * Known PostgreSQL error codes.
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PostgresErrorCodes = {
	// Constraint violations (Class 23)
	UNIQUE_VIOLATION: "23505",
	FOREIGN_KEY_VIOLATION: "23503",
	NOT_NULL_VIOLATION: "23502",
	CHECK_VIOLATION: "23514",
	EXCLUSION_VIOLATION: "23P01",

	// Concurrency errors (Class 40)
	DEADLOCK_DETECTED: "40P01",
	SERIALIZATION_FAILURE: "40001",

	// Permission/Syntax errors (Class 42)
	INSUFFICIENT_PRIVILEGE: "42501",
	SYNTAX_ERROR: "42601",
	UNDEFINED_TABLE: "42P01",
	UNDEFINED_COLUMN: "42703",
	UNDEFINED_FUNCTION: "42883",
	DUPLICATE_OBJECT: "42710",

	// Connection errors (Class 08)
	CONNECTION_FAILURE: "08006",
	CONNECTION_DOES_NOT_EXIST: "08003",
	SQLCLIENT_UNABLE_TO_CONNECT: "08001",
	SQLSERVER_REJECTED_ESTABLISHMENT: "08004",
	TRANSACTION_RESOLUTION_UNKNOWN: "08007",

	// Operator intervention (Class 57)
	QUERY_CANCELED: "57014",
	SYSTEM_ERROR: "57000",

	// System errors (Class 58)
	IO_ERROR: "58030",
	UNDEFINED_FILE: "58P01",
} as const

export type PostgresErrorCode =
	(typeof PostgresErrorCodes)[keyof typeof PostgresErrorCodes]

// =============================================================================
// Database Error Class
// =============================================================================

/**
 * Specialized error class for database-related errors.
 * Extends AppError with PostgreSQL-specific context.
 *
 * @example
 * ```typescript
 * throw new DatabaseError(
 *   'createUser',
 *   'User with this email already exists',
 *   { postgresCode: '23505', constraint: 'users_email_unique', table: 'users' }
 * );
 * ```
 */
export class DatabaseError extends AppError {
	/** PostgreSQL error code if available */
	readonly postgresCode: string | undefined
	/** Database operation that failed */
	readonly operation: string
	/** Constraint name for constraint violations */
	readonly constraint: string | undefined
	/** Table name where error occurred */
	readonly table: string | undefined

	constructor(
		operation: string,
		message: string,
		options?: {
			postgresCode?: string
			constraint?: string
			table?: string
			details?: Record<string, unknown>
		},
	) {
		super(ErrorCodes.DATABASE_ERROR, message, 500, {
			operation,
			...(options?.postgresCode !== undefined && {
				postgresCode: options.postgresCode,
			}),
			...(options?.constraint !== undefined && {
				constraint: options.constraint,
			}),
			...(options?.table !== undefined && { table: options.table }),
			...options?.details,
		})
		this.name = "DatabaseError"
		this.operation = operation
		this.postgresCode = options?.postgresCode
		this.constraint = options?.constraint
		this.table = options?.table
	}
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an error is a PostgreSQL error.
 *
 * @param error - The error to check
 * @returns True if the error has PostgreSQL error properties
 *
 * @example
 * ```typescript
 * try {
 *   await db.insert(users).values({ email: 'duplicate@example.com' });
 * } catch (error) {
 *   if (isPostgresError(error)) {
 *     console.log('Postgres error code:', error.code);
 *   }
 * }
 * ```
 */
export function isPostgresError(error: unknown): error is PostgresError {
	return (
		typeof error === "object" &&
		error !== null &&
		(typeof (error as PostgresError).code === "string" ||
			typeof (error as PostgresError).message === "string")
	)
}

/**
 * Type guard to check if an error is a DatabaseError.
 *
 * @param error - The error to check
 * @returns True if the error is a DatabaseError instance
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
	return error instanceof DatabaseError
}

// =============================================================================
// Error Mapping Types
// =============================================================================

/**
 * Result of mapping a Postgres error code to an AppError type.
 */
interface MappedErrorInfo {
	/** Error code to use */
	code: ErrorCode
	/** User-friendly message */
	message: string
	/** HTTP status code */
	statusCode: number
	/** Type of error for categorization */
	type: "validation" | "not_found" | "server" | "database"
}

// =============================================================================
// Error Mapping Functions
// =============================================================================

/**
 * Maps PostgreSQL error codes to appropriate error information.
 *
 * @param code - PostgreSQL error code
 * @returns Mapped error information for creating appropriate AppError
 *
 * @example
 * ```typescript
 * const info = mapPostgresCodeToError('23505');
 * // Returns { code: 'VALIDATION_ERROR', message: '...', statusCode: 400, type: 'validation' }
 * ```
 */
export function mapPostgresCodeToError(code?: string): MappedErrorInfo {
	switch (code) {
		// Constraint violations - return validation errors
		case PostgresErrorCodes.UNIQUE_VIOLATION:
			return {
				code: ErrorCodes.VALIDATION_ERROR,
				message: "A record with this value already exists",
				statusCode: 400,
				type: "validation",
			}
		case PostgresErrorCodes.FOREIGN_KEY_VIOLATION:
			return {
				code: ErrorCodes.VALIDATION_ERROR,
				message: "Referenced record does not exist",
				statusCode: 400,
				type: "validation",
			}
		case PostgresErrorCodes.NOT_NULL_VIOLATION:
			return {
				code: ErrorCodes.VALIDATION_ERROR,
				message: "A required field is missing",
				statusCode: 400,
				type: "validation",
			}
		case PostgresErrorCodes.CHECK_VIOLATION:
			return {
				code: ErrorCodes.VALIDATION_ERROR,
				message: "Data validation failed",
				statusCode: 400,
				type: "validation",
			}

		// Not found errors
		case PostgresErrorCodes.UNDEFINED_TABLE:
			return {
				code: ErrorCodes.NOT_FOUND,
				message: "Database table not found",
				statusCode: 404,
				type: "not_found",
			}

		// Concurrency errors - return server errors
		case PostgresErrorCodes.DEADLOCK_DETECTED:
			return {
				code: ErrorCodes.INTERNAL_ERROR,
				message:
					"Database deadlock detected. Please retry the operation",
				statusCode: 500,
				type: "server",
			}
		case PostgresErrorCodes.SERIALIZATION_FAILURE:
			return {
				code: ErrorCodes.INTERNAL_ERROR,
				message:
					"Concurrent modification conflict. Please retry the operation",
				statusCode: 500,
				type: "server",
			}

		// Permission errors
		case PostgresErrorCodes.INSUFFICIENT_PRIVILEGE:
			return {
				code: ErrorCodes.FORBIDDEN,
				message: "Insufficient database permissions",
				statusCode: 403,
				type: "server",
			}

		// Connection errors - return service unavailable
		case PostgresErrorCodes.CONNECTION_FAILURE:
		case PostgresErrorCodes.SQLCLIENT_UNABLE_TO_CONNECT:
		case PostgresErrorCodes.SQLSERVER_REJECTED_ESTABLISHMENT:
			return {
				code: ErrorCodes.SERVICE_UNAVAILABLE,
				message: "Database connection failed",
				statusCode: 503,
				type: "server",
			}

		// Timeout/cancellation
		case PostgresErrorCodes.QUERY_CANCELED:
		case PostgresErrorCodes.SYSTEM_ERROR:
			return {
				code: ErrorCodes.SERVICE_UNAVAILABLE,
				message: "Database operation timed out",
				statusCode: 503,
				type: "server",
			}

		// Default - generic database error
		default:
			return {
				code: ErrorCodes.DATABASE_ERROR,
				message: "A database error occurred",
				statusCode: 500,
				type: "database",
			}
	}
}

/**
 * Wraps raw PostgreSQL errors into typed DatabaseError or appropriate AppError subclass.
 *
 * This function analyzes the error, extracts PostgreSQL-specific information,
 * and returns an appropriately typed error with full context.
 *
 * @param operation - The database operation that failed (e.g., 'saveChat', 'getUserById')
 * @param error - The raw error from the database operation
 * @param fallbackMessage - Optional fallback message if no error message available
 * @returns Typed AppError instance (DatabaseError, ValidationError, etc.)
 *
 * @example
 * ```typescript
 * try {
 *   await db.insert(users).values({ email: 'test@example.com' });
 * } catch (error) {
 *   throw toDatabaseError('createUser', error, 'Failed to create user');
 * }
 * ```
 */
export function toDatabaseError(
	operation: string,
	error: unknown,
	fallbackMessage?: string,
): AppError {
	// If already an AppError, return as-is
	if (error instanceof AppError) {
		return error
	}

	// Extract Postgres error info if available
	const pgError = isPostgresError(error) ? error : undefined
	const postgresCode = pgError?.code

	// Map the Postgres code to appropriate error type
	const mappedError = mapPostgresCodeToError(postgresCode)

	// Build detailed message
	const message = fallbackMessage ?? pgError?.message ?? mappedError.message

	// Build details object
	const details: Record<string, unknown> = {
		operation,
		...(postgresCode !== undefined && { postgresCode }),
		...(pgError?.constraint !== undefined && {
			constraint: pgError.constraint,
		}),
		...(pgError?.table !== undefined && { table: pgError.table }),
		...(pgError?.column !== undefined && { column: pgError.column }),
	}

	// Return appropriate error type based on mapped info
	switch (mappedError.type) {
		case "validation":
			return new ValidationError(message, details)
		case "not_found":
			return new NotFoundError(
				"Database resource",
				pgError?.table,
				details,
			)
		case "server":
			return new InternalServerError(message, details)
		default: {
			// Build options object only with defined values for exactOptionalPropertyTypes
			const options: {
				postgresCode?: string
				constraint?: string
				table?: string
				details?: Record<string, unknown>
			} = {}
			if (postgresCode !== undefined) {
				options.postgresCode = postgresCode
			}
			if (pgError?.constraint !== undefined) {
				options.constraint = pgError.constraint
			}
			if (pgError?.table !== undefined) {
				options.table = pgError.table
			}
			options.details = details
			return new DatabaseError(operation, message, options)
		}
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a Postgres error code indicates a unique constraint violation.
 *
 * @param code - PostgreSQL error code
 * @returns True if the code indicates a unique violation
 */
export function isUniqueViolation(code?: string): boolean {
	return code === PostgresErrorCodes.UNIQUE_VIOLATION
}

/**
 * Checks if a Postgres error code indicates a foreign key violation.
 *
 * @param code - PostgreSQL error code
 * @returns True if the code indicates a foreign key violation
 */
export function isForeignKeyViolation(code?: string): boolean {
	return code === PostgresErrorCodes.FOREIGN_KEY_VIOLATION
}

/**
 * Checks if a Postgres error code indicates a connection error.
 *
 * @param code - PostgreSQL error code
 * @returns True if the code indicates a connection failure
 */
export function isConnectionError(code?: string): boolean {
	return (
		code === PostgresErrorCodes.CONNECTION_FAILURE ||
		code === PostgresErrorCodes.SQLCLIENT_UNABLE_TO_CONNECT ||
		code === PostgresErrorCodes.SQLSERVER_REJECTED_ESTABLISHMENT ||
		code === PostgresErrorCodes.CONNECTION_DOES_NOT_EXIST
	)
}

/**
 * Checks if a Postgres error code indicates a timeout.
 *
 * @param code - PostgreSQL error code
 * @returns True if the code indicates a timeout or cancellation
 */
export function isTimeoutError(code?: string): boolean {
	return (
		code === PostgresErrorCodes.QUERY_CANCELED ||
		code === PostgresErrorCodes.SYSTEM_ERROR
	)
}

/**
 * Checks if a Postgres error code indicates a deadlock.
 *
 * @param code - PostgreSQL error code
 * @returns True if the code indicates a deadlock
 */
export function isDeadlockError(code?: string): boolean {
	return (
		code === PostgresErrorCodes.DEADLOCK_DETECTED ||
		code === PostgresErrorCodes.SERIALIZATION_FAILURE
	)
}
