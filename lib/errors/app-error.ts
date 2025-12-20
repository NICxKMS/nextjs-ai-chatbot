/**
 * Application Error Class
 * @module lib/errors/app-error
 * 
 * Core error class for the application with:
 * - Typed error codes
 * - HTTP status code inference
 * - Response serialization
 * - Server Action result conversion
 * - Static factory methods
 */

// Node.js process type declaration
declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

import type {
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  AppErrorOptions,
  ActionResult,
  ErrorResponse,
  STATUS_CODES,
} from './types';
import { getMessage } from './messages';

/**
 * Check if running in development mode
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Infer HTTP status code from error code category
 */
function inferStatusCode(code: ErrorCode): number {
  const category = code.split(':')[0] as ErrorCategory;
  const statusMap: Record<ErrorCategory, number> = {
    auth: 401,
    validation: 400,
    resource: 404,
    rate_limit: 429,
    external: 502,
    internal: 500,
  };
  return statusMap[category] ?? 500;
}

/**
 * Application Error class
 * 
 * Structured error type for consistent error handling across:
 * - API routes (toResponse)
 * - Server Actions (toActionResult)
 * - Error boundaries
 * 
 * @example
 * ```ts
 * // Direct construction
 * throw new AppError({
 *   code: 'auth:unauthorized',
 *   message: 'Please sign in',
 * });
 * 
 * // Using factory methods
 * throw AppError.unauthorized();
 * throw AppError.notFound('chat');
 * ```
 */
export class AppError extends Error {
  /** Error code in format 'category:specific' */
  readonly code: ErrorCode;

  /** HTTP status code for API responses */
  readonly statusCode: number;

  /** Error severity for logging decisions */
  readonly severity: ErrorSeverity;

  /** Whether this is an operational error (vs programming error) */
  readonly isOperational: boolean;

  /** Additional context for debugging */
  readonly context?: ErrorContext;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = inferStatusCode(options.code);
    this.severity = options.severity ?? 'error';
    this.isOperational = options.isOperational ?? true;
    this.context = options.context;

    // Capture stack trace, excluding constructor (V8 only)
    if ('captureStackTrace' in Error) {
      (Error as { captureStackTrace: (target: object, constructor: Function) => void })
        .captureStackTrace(this, AppError);
    }

    // Set cause if provided
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Convert to HTTP Response for API routes
   * Only includes context in development mode
   */
  toResponse(): Response {
    const body: ErrorResponse = {
      code: this.code,
      message: this.message,
    };

    if (isDev && this.context) {
      body.context = this.context;
    }

    return Response.json(body, {
      status: this.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Convert to ActionResult for Server Actions
   * Type-safe error return without throwing
   */
  toActionResult<T>(): ActionResult<T> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }

  /**
   * Create JSON-serializable error object
   */
  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      ...(isDev && this.context && { context: this.context }),
    };
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  /**
   * Create unauthorized error (401)
   */
  static unauthorized(options?: { message?: string; context?: ErrorContext }): AppError {
    return new AppError({
      code: 'auth:unauthorized',
      message: options?.message ?? getMessage('auth:unauthorized'),
      context: options?.context,
    });
  }

  /**
   * Create forbidden error (403)
   */
  static forbidden(options?: { message?: string; context?: ErrorContext }): AppError {
    return new AppError({
      code: 'auth:forbidden',
      message: options?.message ?? getMessage('auth:forbidden'),
      context: options?.context,
    });
  }

  /**
   * Create not found error (404)
   * @param variant - Resource type for specific message
   */
  static notFound(
    variant?: string,
    options?: { message?: string; context?: ErrorContext }
  ): AppError {
    return new AppError({
      code: 'resource:not_found',
      message: options?.message ?? getMessage('resource:not_found', { variant }),
      context: options?.context,
    });
  }

  /**
   * Create validation error (400)
   */
  static validation(options?: {
    message?: string;
    field?: string;
    context?: ErrorContext;
  }): AppError {
    return new AppError({
      code: 'validation:invalid_input',
      message: options?.message ?? getMessage('validation:invalid_input'),
      context: {
        ...options?.context,
        ...(options?.field && { field: options.field }),
      },
    });
  }

  /**
   * Create rate limit error (429)
   * @param userType - User type for specific message
   */
  static rateLimit(
    userType?: 'guest' | 'regular',
    options?: { message?: string; context?: ErrorContext }
  ): AppError {
    return new AppError({
      code: 'rate_limit:exceeded',
      message: options?.message ?? getMessage('rate_limit:exceeded', { userType }),
      context: options?.context,
    });
  }

  /**
   * Create external service error (502)
   */
  static external(options?: {
    service?: string;
    message?: string;
    cause?: Error;
    context?: ErrorContext;
  }): AppError {
    return new AppError({
      code: 'external:ai_provider',
      message: options?.message ?? getMessage('external:ai_provider'),
      cause: options?.cause,
      context: {
        ...options?.context,
        ...(options?.service && { service: options.service }),
      },
    });
  }

  /**
   * Create internal server error (500)
   */
  static internal(options?: {
    message?: string;
    cause?: Error;
    context?: ErrorContext;
  }): AppError {
    return new AppError({
      code: 'internal:unknown',
      message: options?.message ?? getMessage('internal:unknown'),
      severity: 'error',
      isOperational: false,
      cause: options?.cause,
      context: options?.context,
    });
  }

  /**
   * Wrap unknown error in AppError
   * Useful for catch blocks
   */
  static from(error: unknown, fallbackCode?: ErrorCode): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const cause = error instanceof Error ? error : undefined;

    return new AppError({
      code: fallbackCode ?? 'internal:unknown',
      message,
      cause,
      isOperational: false,
    });
  }
}
