/**
 * Structured Logger Utility
 * Edge-compatible logging with levels and context
 *
 * @module lib/utils/logger
 */

import { REQUEST_ID_HEADER } from "@/lib/middleware/request-id";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
    [key: string]: unknown;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    /** Optional error details */
    error?: SerializedError;
    /** Request ID for correlation */
    requestId?: string;
}

export interface SerializedError {
    name: string;
    message: string;
    stack?: string;
    cause?: SerializedError;
    code?: string | number;
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Default minimum level from env
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

/**
 * Serialize an error object for structured logging
 */
export function serializeError(error: unknown): SerializedError {
    if (error instanceof Error) {
        const serialized: SerializedError = {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };

        // Handle error cause (ES2022+)
        if (error.cause) {
            serialized.cause = serializeError(error.cause);
        }

        // Capture additional properties
        const errorObj = error as unknown as Record<string, unknown>;
        if (errorObj.code !== undefined) {
            serialized.code = errorObj.code as string | number;
        }

        // Copy any additional enumerable properties
        for (const key of Object.keys(error)) {
            if (!(key in serialized)) {
                serialized[key] = errorObj[key];
            }
        }

        return serialized;
    }

    // Handle non-Error objects
    if (typeof error === "object" && error !== null) {
        return {
            name: "UnknownError",
            message: JSON.stringify(error),
            ...(error as Record<string, unknown>),
        };
    }

    return {
        name: "UnknownError",
        message: String(error),
    };
}

function formatEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, error, requestId } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    const parts = [prefix];

    // Add request ID if present for correlation
    if (requestId) {
        parts.push(`[${requestId}]`);
    }

    parts.push(message);

    if (error) {
        parts.push(`Error: ${error.name}: ${error.message}`);
    }

    if (context && Object.keys(context).length > 0) {
        parts.push(JSON.stringify(context));
    }

    return parts.join(" ");
}

function createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
): LogEntry {
    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
    };

    if (error) {
        entry.error = serializeError(error);
    }

    return entry;
}

export interface Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    /** Log with error object for structured error logging */
    errorWithCause(message: string, error: unknown, context?: LogContext): void;
    child(defaultContext: LogContext): Logger;
    /** Time an operation and log the duration */
    time<T>(label: string, fn: () => T): T;
    /** Time an async operation and log the duration */
    timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Structured logger instance
 *
 * @example
 * ```typescript
 * import { logger } from "@/lib/utils/logger";
 *
 * logger.info("User logged in", { userId: "123" });
 * logger.error("Failed to process request", { error: err.message });
 *
 * // Create child logger with preset context
 * const authLogger = logger.child({ module: "auth" });
 * authLogger.info("Token refreshed"); // Includes { module: "auth" }
 * ```
 */
export const logger: Logger = {
    debug(message: string, context?: LogContext): void {
        if (!shouldLog("debug")) {
            return;
        }
        console.debug(formatEntry(createEntry("debug", message, context)));
    },

    info(message: string, context?: LogContext): void {
        if (!shouldLog("info")) {
            return;
        }
        console.info(formatEntry(createEntry("info", message, context)));
    },

    warn(message: string, context?: LogContext): void {
        if (!shouldLog("warn")) {
            return;
        }
        console.warn(formatEntry(createEntry("warn", message, context)));
    },

    error(message: string, context?: LogContext): void {
        if (!shouldLog("error")) {
            return;
        }
        console.error(formatEntry(createEntry("error", message, context)));
    },

    errorWithCause(
        message: string,
        error: unknown,
        context?: LogContext
    ): void {
        if (!shouldLog("error")) {
            return;
        }
        const entry = createEntry("error", message, context, error);
        console.error(formatEntry(entry));
        // Also log the full error for detailed debugging
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    },

    /** Create a child logger with preset context */
    child(defaultContext: LogContext): Logger {
        return {
            debug: (msg: string, ctx?: LogContext) =>
                logger.debug(msg, { ...defaultContext, ...ctx }),
            info: (msg: string, ctx?: LogContext) =>
                logger.info(msg, { ...defaultContext, ...ctx }),
            warn: (msg: string, ctx?: LogContext) =>
                logger.warn(msg, { ...defaultContext, ...ctx }),
            error: (msg: string, ctx?: LogContext) =>
                logger.error(msg, { ...defaultContext, ...ctx }),
            errorWithCause: (msg: string, err: unknown, ctx?: LogContext) =>
                logger.errorWithCause(msg, err, { ...defaultContext, ...ctx }),
            child: (ctx: LogContext) =>
                logger.child({ ...defaultContext, ...ctx }),
            time: <T>(label: string, fn: () => T) => logger.time(label, fn),
            timeAsync: <T>(label: string, fn: () => Promise<T>) =>
                logger.timeAsync(label, fn),
        };
    },

    /** Time a synchronous operation */
    time<T>(label: string, fn: () => T): T {
        const start = performance.now();
        try {
            return fn();
        } finally {
            const duration = performance.now() - start;
            this.debug(`${label} completed`, {
                durationMs: duration.toFixed(2),
            });
        }
    },

    /** Time an asynchronous operation */
    async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            this.debug(`${label} completed`, {
                durationMs: duration.toFixed(2),
            });
        }
    },
};

/**
 * Create a request-scoped logger with correlation ID.
 *
 * Extracts the request ID from the request headers and includes it
 * in all log messages for distributed tracing.
 *
 * @param request - Incoming request (NextRequest or Request)
 * @returns Logger with request context preset
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const log = createRequestLogger(request);
 *   log.info("Processing chat request");
 *   // Logs: [timestamp] [INFO] [req_abc123] Processing chat request
 * }
 * ```
 */
export function createRequestLogger(request: Request): Logger {
    const requestId =
        request.headers.get(REQUEST_ID_HEADER) ??
        request.headers.get("X-Correlation-ID") ??
        undefined;

    return logger.child({ requestId });
}

export default logger;
