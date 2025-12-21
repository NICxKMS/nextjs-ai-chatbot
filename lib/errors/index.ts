/**
 * Error Handling Module - Public API
 * Ref: 01-error-handling-optimal-design.md
 *
 * @module lib/errors
 */

// Core class
export { AppError } from "./app-error";
// Factory functions
export {
    authError,
    externalError,
    forbiddenError,
    notFoundError,
    rateLimitError,
    validationError,
} from "./factories";
// Mappers
export { isPostgresError, mapPostgresError } from "./mappers/postgres";
// Messages
export { getMessage, registerMessages } from "./messages";
// Types
export type {
    ActionResult,
    AppErrorOptions,
    ErrorCategory,
    ErrorCode,
    ErrorSeverity,
    LogContext,
    MessageConfig,
} from "./types";
// Utilities
export {
    ensureAppError,
    inferStatusCode,
    isAppError,
    serializeError,
} from "./utils";
