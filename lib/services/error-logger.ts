/**
 * Error Logging Service
 * Centralized error logging with structured output and context.
 *
 * @module lib/services/error-logger
 * @see OPT-019
 */

import { type AppError, isAppError } from "@/lib/errors";
import { type LogContext, logger, serializeError } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

export type ErrorLogLevel = "warn" | "error" | "critical";

export interface ErrorLogOptions {
    /** Error severity level */
    level?: ErrorLogLevel;
    /** Additional context data */
    context?: Record<string, unknown>;
    /** User ID for attribution */
    userId?: string;
    /** Request ID for correlation */
    requestId?: string;
    /** Whether to report to external service (future) */
    report?: boolean;
    /** Tags for categorization */
    tags?: string[];
}

export interface ErrorLogEntry {
    /** Timestamp of the error */
    timestamp: string;
    /** Error severity level */
    level: ErrorLogLevel;
    /** Error code (if AppError) */
    code?: string;
    /** Error message */
    message: string;
    /** Serialized error details */
    error: ReturnType<typeof serializeError>;
    /** Additional context */
    context?: Record<string, unknown>;
    /** User ID if available */
    userId?: string;
    /** Request ID for correlation */
    requestId?: string;
    /** Tags for categorization */
    tags?: string[];
}

// =============================================================================
// ERROR LOGGER
// =============================================================================

/**
 * Centralized error logging service.
 *
 * Provides structured error logging with support for:
 * - AppError integration
 * - Context enrichment
 * - Request correlation
 * - Severity levels
 *
 * @example
 * ```ts
 * import { errorLogger } from "@/lib/services/error-logger";
 *
 * // Log an error with context
 * errorLogger.log(error, { userId: "123", action: "createChat" });
 *
 * // Log a warning
 * errorLogger.warn("Rate limit approaching", { remaining: 10 });
 *
 * // Log critical error
 * errorLogger.error(error, { critical: true, service: "database" });
 *
 * // Create scoped logger
 * const chatLogger = errorLogger.scope("chat");
 * chatLogger.log(error, { chatId: "abc" });
 * ```
 */
export const errorLogger = {
    /**
     * Log an error with optional context.
     */
    log(error: Error, context?: Record<string, unknown>): void {
        const entry = createErrorEntry(error, { level: "error", context });
        logEntry(entry);
    },

    /**
     * Log a warning message with optional context.
     */
    warn(message: string, context?: Record<string, unknown>): void {
        logger.warn(message, context as LogContext);
    },

    /**
     * Log an error with full options.
     */
    error(error: Error, options?: ErrorLogOptions): void {
        const entry = createErrorEntry(error, {
            level: options?.level ?? "error",
            ...options,
        });
        logEntry(entry);

        // Future: report to external service
        if (options?.report) {
            reportError(entry);
        }
    },

    /**
     * Log a critical error (highest severity).
     */
    critical(error: Error, context?: Record<string, unknown>): void {
        const entry = createErrorEntry(error, { level: "critical", context });
        logEntry(entry);
        reportError(entry);
    },

    /**
     * Create a scoped error logger with preset context.
     */
    scope(
        scope: string,
        defaultContext?: Record<string, unknown>
    ): ScopedErrorLogger {
        return createScopedLogger(scope, defaultContext);
    },

    /**
     * Create a request-scoped error logger.
     */
    forRequest(requestId: string, userId?: string): ScopedErrorLogger {
        return createScopedLogger("request", { requestId, userId });
    },
};

// =============================================================================
// SCOPED LOGGER
// =============================================================================

export interface ScopedErrorLogger {
    log(error: Error, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(
        error: Error,
        options?: Omit<ErrorLogOptions, "requestId" | "userId">
    ): void;
    critical(error: Error, context?: Record<string, unknown>): void;
}

function createScopedLogger(
    scope: string,
    defaultContext?: Record<string, unknown>
): ScopedErrorLogger {
    const mergeContext = (ctx?: Record<string, unknown>) => ({
        scope,
        ...defaultContext,
        ...ctx,
    });

    return {
        log(error: Error, context?: Record<string, unknown>): void {
            errorLogger.log(error, mergeContext(context));
        },
        warn(message: string, context?: Record<string, unknown>): void {
            errorLogger.warn(message, mergeContext(context));
        },
        error(
            error: Error,
            options?: Omit<ErrorLogOptions, "requestId" | "userId">
        ): void {
            errorLogger.error(error, {
                ...options,
                context: mergeContext(options?.context),
                requestId: defaultContext?.requestId as string | undefined,
                userId: defaultContext?.userId as string | undefined,
            });
        },
        critical(error: Error, context?: Record<string, unknown>): void {
            errorLogger.critical(error, mergeContext(context));
        },
    };
}

// =============================================================================
// HELPERS
// =============================================================================

function createErrorEntry(
    error: Error,
    options: ErrorLogOptions
): ErrorLogEntry {
    const { level = "error", context, userId, requestId, tags } = options;

    const entry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: error.message,
        error: serializeError(error),
        context,
        userId,
        requestId,
        tags,
    };

    // Extract code from AppError
    if (isAppError(error)) {
        entry.code = (error as AppError).code;
    }

    return entry;
}

function logEntry(entry: ErrorLogEntry): void {
    const { level, message, error, context, requestId, userId, code, tags } =
        entry;

    const logContext: LogContext = {
        ...context,
        errorName: error.name,
        errorCode: code,
        requestId,
        userId,
        tags,
    };

    // Remove undefined values
    for (const key of Object.keys(logContext)) {
        if (logContext[key] === undefined) {
            delete logContext[key];
        }
    }

    switch (level) {
        case "warn":
            logger.warn(message, logContext);
            break;
        case "error":
            logger.errorWithCause(message, entry.error, logContext);
            break;
        case "critical":
            logger.errorWithCause(
                `[CRITICAL] ${message}`,
                entry.error,
                logContext
            );
            break;
    }
}

/**
 * Report error to external service (placeholder for future implementation).
 * Could integrate with Sentry, DataDog, etc.
 */
function reportError(_entry: ErrorLogEntry): void {
    // External error reporting integration point
    // Supported services: Sentry, DataDog, or custom telemetry endpoint
    // To enable: Set SENTRY_DSN or DATADOG_API_KEY in environment
    //
    // Example integration:
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(entry.error, { extra: { code: entry.code } });
    // }

    // Development: Log that error would be reported to external service
    if (process.env.NODE_ENV === "development") {
        console.debug(
            "[ErrorLogger] Would report to external service:",
            _entry.code ?? _entry.message
        );
    }
}

export default errorLogger;
