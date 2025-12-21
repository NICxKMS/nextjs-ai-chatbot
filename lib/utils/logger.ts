/**
 * Structured Logger Utility
 * Edge-compatible logging with levels and context
 *
 * @module lib/utils/logger
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
    [key: string]: unknown;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
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

function formatEntry(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (context && Object.keys(context).length > 0) {
        return `${prefix} ${message} ${JSON.stringify(context)}`;
    }

    return `${prefix} ${message}`;
}

function createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
): LogEntry {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
    };
}

export interface Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    child(defaultContext: LogContext): Logger;
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
        if (!shouldLog("debug")) return;
        console.debug(formatEntry(createEntry("debug", message, context)));
    },

    info(message: string, context?: LogContext): void {
        if (!shouldLog("info")) return;
        console.info(formatEntry(createEntry("info", message, context)));
    },

    warn(message: string, context?: LogContext): void {
        if (!shouldLog("warn")) return;
        console.warn(formatEntry(createEntry("warn", message, context)));
    },

    error(message: string, context?: LogContext): void {
        if (!shouldLog("error")) return;
        console.error(formatEntry(createEntry("error", message, context)));
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
            child: (ctx: LogContext) =>
                logger.child({ ...defaultContext, ...ctx }),
        };
    },
};

export default logger;
