/**
 * Error Handling Module
 * @module lib/errors
 * 
 * Public API for application error handling:
 * - AppError class for structured errors
 * - Type definitions for error codes and results
 * - Message catalog for user-friendly messages
 * - Convenience factory functions
 */

// Re-export main error class
export { AppError } from './app-error';

// Re-export types
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  ErrorContext,
  AppErrorOptions,
  ErrorResponse,
  ActionResult,
} from './types';

export { STATUS_CODES } from './types';

// Re-export message utilities
export { getMessage, hasMessage } from './messages';

// Re-export mappers
export * from './mappers';

// ============================================
// Convenience Factory Functions
// ============================================

import { AppError } from './app-error';
import type { ErrorContext } from './types';

/**
 * Create an unauthorized error
 * @see AppError.unauthorized
 */
export function unauthorized(options?: {
  message?: string;
  context?: ErrorContext;
}): AppError {
  return AppError.unauthorized(options);
}

/**
 * Create a forbidden error
 * @see AppError.forbidden
 */
export function forbidden(options?: {
  message?: string;
  context?: ErrorContext;
}): AppError {
  return AppError.forbidden(options);
}

/**
 * Create a not found error
 * @see AppError.notFound
 */
export function notFound(
  variant?: string,
  options?: { message?: string; context?: ErrorContext }
): AppError {
  return AppError.notFound(variant, options);
}

/**
 * Create a validation error
 * @see AppError.validation
 */
export function validationError(options?: {
  message?: string;
  field?: string;
  context?: ErrorContext;
}): AppError {
  return AppError.validation(options);
}

/**
 * Create a rate limit error
 * @see AppError.rateLimit
 */
export function rateLimit(
  userType?: 'guest' | 'regular',
  options?: { message?: string; context?: ErrorContext }
): AppError {
  return AppError.rateLimit(userType, options);
}

/**
 * Wrap unknown error in AppError
 * @see AppError.from
 */
export function wrapError(error: unknown): AppError {
  return AppError.from(error);
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
