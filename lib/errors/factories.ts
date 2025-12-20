/**
 * Error Factory Functions
 * Ref: 01-error-handling-optimal-design.md §9.1
 *
 * Convenience functions for creating common errors
 */

import { AppError } from './app-error';
import type { ErrorCode } from './types';

/**
 * Create an authentication error
 */
export function authError(
  reason: string = 'unauthorized',
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: `auth:${reason}` as ErrorCode,
    context,
  });
}

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'validation:invalid_input',
    message,
    context,
  });
}

/**
 * Create a not found error
 */
export function notFoundError(
  resource: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: `resource:not_found:${resource}` as ErrorCode,
    context,
  });
}

/**
 * Create a rate limit error
 */
export function rateLimitError(
  retryAfter?: number,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: 'rate_limit:exceeded',
    context: {
      ...context,
      retryAfter,
    },
  });
}

/**
 * Create a forbidden/access denied error
 */
export function forbiddenError(
  resource?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: resource
      ? (`resource:access_denied:${resource}` as ErrorCode)
      : 'auth:forbidden',
    context,
  });
}

/**
 * Create an external service error
 */
export function externalError(
  service: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError({
    code: `external:${service}` as ErrorCode,
    severity: 'error',
    context,
  });
}
