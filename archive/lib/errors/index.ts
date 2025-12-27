/**
 * Error Handling Module - Public API
 * Ref: 01-error-handling-optimal-design.md
 * Ref: REQ-018 (Typed Error Handling)
 *
 * @module lib/errors
 */

// AI Error Classes
export {
    AIProviderError,
    ContentFilterError,
    ModelNotFoundError,
    StreamingError,
    TokenLimitError,
} from "./ai";

// API Error Classes
export {
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
} from "./api";
// Core class
export { AppError } from "./app-error";
export type {
    ClientError,
    ClientErrorReporterOptions,
    ErrorLevel,
} from "./client-reporter";
// Client-side error reporting
export {
    ClientErrorReporter,
    captureRenderError,
    createErrorBoundaryHandler,
    errorReporter,
} from "./client-reporter";
// Factory functions (legacy compatibility)
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
