/**
 * Error Types and Codes
 * @module lib/errors/types
 * 
 * Defines the type system for application errors including:
 * - Error severity levels
 * - Error categories
 * - Error codes (composite type)
 * - Action result types for Server Actions
 */

/**
 * Error severity levels for logging and handling decisions
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

/**
 * Error categories for grouping and routing
 */
export type ErrorCategory =
  | 'auth'        // Authentication/authorization
  | 'validation'  // Input validation
  | 'resource'    // Not found, conflict
  | 'rate_limit'  // Throttling
  | 'external'    // Third-party services
  | 'internal';   // Server errors

/**
 * Error code format: category:specific_error
 * @example 'auth:unauthorized', 'validation:invalid_input'
 */
export type ErrorCode = `${ErrorCategory}:${string}`;

/**
 * Additional context for error logging and debugging
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Options for constructing an AppError
 */
export interface AppErrorOptions {
  /** Error code in format 'category:specific' */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Error severity level */
  severity?: ErrorSeverity;
  /** Whether this is an operational error (vs programming error) */
  isOperational?: boolean;
  /** Additional context for debugging */
  context?: ErrorContext;
  /** Original error that caused this error */
  cause?: Error;
}

/**
 * Error object structure for client responses
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  context?: ErrorContext;
}

/**
 * Type-safe result type for Server Actions
 * Replaces throwing errors with explicit return types
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

/**
 * HTTP status code mappings for error categories
 */
export const STATUS_CODES: Record<ErrorCategory, number> = {
  auth: 401,
  validation: 400,
  resource: 404,
  rate_limit: 429,
  external: 502,
  internal: 500,
} as const;
