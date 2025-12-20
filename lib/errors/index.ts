/**
 * Error Handling Module - Public API
 * Ref: 01-error-handling-optimal-design.md
 *
 * @module lib/errors
 */

// Core class
export { AppError } from './app-error';

// Types
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  AppErrorOptions,
  ActionResult,
  MessageConfig,
  LogContext,
} from './types';

// Messages
export { getMessage, registerMessages } from './messages';

// Utilities
export {
  inferStatusCode,
  isAppError,
  ensureAppError,
  serializeError,
} from './utils';

// Factory functions
export {
  authError,
  validationError,
  notFoundError,
  rateLimitError,
  forbiddenError,
  externalError,
} from './factories';

// Mappers
export { mapPostgresError, isPostgresError } from './mappers/postgres';
