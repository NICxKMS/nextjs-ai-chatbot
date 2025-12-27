/**
 * Base Error Class
 * @module @/src/errors/base.error
 *
 * Foundation for all application errors.
 * All custom errors extend AppError.
 */

export interface ErrorContext {
	[key: string]: unknown;
}

export interface SerializedError {
	name: string;
	code: string;
	message: string;
	context?: ErrorContext;
	cause?: SerializedError;
	stack?: string;
}

/**
 * Base application error class.
 * All domain and infrastructure errors should extend this.
 */
export abstract class AppError extends Error {
	/** Machine-readable error code */
	abstract readonly code: string;

	/** HTTP status code for API responses */
	abstract readonly statusCode: number;

	/** Additional error context for debugging */
	readonly context?: ErrorContext;

	/** Whether this error should be logged */
	readonly shouldLog: boolean = true;

	/** Whether this error is operational (expected) vs programmer error */
	readonly isOperational: boolean = true;

	constructor(
		message: string,
		options?: {
			cause?: Error;
			context?: ErrorContext;
			shouldLog?: boolean;
			isOperational?: boolean;
		},
	) {
		super(message, { cause: options?.cause });
		this.name = this.constructor.name;
		this.context = options?.context;

		if (options?.shouldLog !== undefined) {
			this.shouldLog = options.shouldLog;
		}
		if (options?.isOperational !== undefined) {
			this.isOperational = options.isOperational;
		}

		// Maintains proper stack trace in V8 engines
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Serializes the error for logging or API responses
	 */
	toJSON(): SerializedError {
		const serialized: SerializedError = {
			name: this.name,
			code: this.code,
			message: this.message,
		};

		if (this.context && Object.keys(this.context).length > 0) {
			serialized.context = this.context;
		}

		if (this.cause instanceof AppError) {
			serialized.cause = this.cause.toJSON();
		} else if (this.cause instanceof Error) {
			serialized.cause = {
				name: this.cause.name,
				code: "UNKNOWN",
				message: this.cause.message,
				stack: this.cause.stack,
			};
		}

		if (process.env.NODE_ENV !== "production") {
			serialized.stack = this.stack;
		}

		return serialized;
	}

	/**
	 * Creates a string representation for logging
	 */
	toString(): string {
		let str = `[${this.code}] ${this.name}: ${this.message}`;
		if (this.context) {
			str += ` | Context: ${JSON.stringify(this.context)}`;
		}
		if (this.cause) {
			str += ` | Caused by: ${this.cause}`;
		}
		return str;
	}
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

/**
 * Wraps an unknown error into an AppError
 */
export function wrapError(error: unknown, fallbackMessage: string): Error {
	if (error instanceof Error) {
		return error;
	}
	if (typeof error === "string") {
		return new Error(error);
	}
	return new Error(fallbackMessage);
}
