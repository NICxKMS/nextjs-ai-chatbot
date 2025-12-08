import "server-only";

import {
    addAttribute,
    noticeError,
    recordEvent,
    recordMetric,
} from "./newrelic-agent";

/**
 * ==============================================================================
 * STRUCTURED LOGGING SYSTEM - NEW RELIC INTEGRATION
 * ==============================================================================
 *
 * Centralized logging with consistent formatting, automatic context, and
 * New Relic APM integration for production observability.
 *
 * Features:
 * - Structured JSON logging for easy parsing
 * - Automatic request context (userId, chatId, requestId)
 * - Log levels: trace, debug, info, warn, error, perf
 * - Performance tracking with automatic duration calculation
 * - Sensitive data filtering (API keys, passwords, tokens)
 * - New Relic custom events and attributes
 * - Environment-aware (verbose in dev, minimal in prod)
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/monitoring/logger';
 *
 * // Application flow
 * logger.info('User logged in', { userId: '123', method: 'oauth' });
 *
 * // Performance tracking
 * const duration = performance.now() - start;
 * logger.perf('ChatCompletion', duration, { model: 'gpt-4', tokens: 150 });
 *
 * // Errors with context
 * logger.error('Database query failed', error, { query: 'getUser', userId });
 *
 * // Auto-trace function
 * const result = await logger.trace('fetchUserData', async () => {
 *   return await db.query(...);
 * });
 * ```
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "perf";

export type LogContext = {
    userId?: string;
    chatId?: string;
    requestId?: string;
    model?: string;
    [key: string]: unknown;
};

export type PerformanceLog = {
    operation: string;
    duration: number; // milliseconds
    timestamp: string;
    context?: LogContext;
};

const LOG_LEVELS: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    perf: 2, // Same as info
};

// Get current log level from environment (default: info in production, debug in dev)
const CURRENT_LOG_LEVEL: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) ||
    (process.env.NODE_ENV === "production" ? "info" : "debug");

// Sensitive keys to redact in logs
const SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "authorization",
    "cookie",
    "session",
    // PII protection
    "creditCard",
    "credit_card",
    "cardNumber",
    "card_number",
    "ssn",
    "cvv",
    "pin",
];

/**
 * Check if log level should be emitted
 */
function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

/**
 * Redact sensitive values from objects
 */
function redactSensitive(
    obj: Record<string, unknown>
): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (
            SENSITIVE_KEYS.some((sensitive) =>
                key.toLowerCase().includes(sensitive)
            )
        ) {
            redacted[key] = "[REDACTED]";
        } else if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            redacted[key] = redactSensitive(value as Record<string, unknown>);
        } else {
            redacted[key] = value;
        }
    }

    return redacted;
}

/**
 * Format log entry for consistent output
 */
function formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
): string {
    const timestamp = new Date().toISOString();
    const safeContext = context ? redactSensitive(context) : {};

    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...safeContext,
    };

    // Pretty print in development, single-line JSON in production
    return process.env.NODE_ENV === "production"
        ? JSON.stringify(logEntry)
        : JSON.stringify(logEntry, null, 2);
}

/**
 * Send log to New Relic as custom event
 */
function sendToNewRelic(
    eventType: string,
    attributes: Record<string, unknown>
) {
    // Filter to only include primitive values that New Relic accepts
    const safeAttributes: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            safeAttributes[key] = value;
        }
    }
    recordEvent(eventType, safeAttributes);
}

/**
 * Add custom attributes to current New Relic transaction
 */
function addTransactionAttributes(attributes: Record<string, unknown>) {
    for (const [key, value] of Object.entries(attributes)) {
        // Only add primitive values (New Relic limitation)
        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            addAttribute(key, value);
        }
    }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext) {
    if (!shouldLog(level)) {
        return;
    }

    const formattedLog = formatLogEntry(level, message, context);

    // Output to console (structured for New Relic log forwarding)
    if (level === "error") {
        console.error(formattedLog);
    } else if (level === "warn") {
        console.warn(formattedLog);
    } else {
        console.log(formattedLog);
    }

    // Send ALL logs to New Relic as custom events for advanced querying
    // This ensures visibility in New Relic's custom events dashboard
    sendToNewRelic("ApplicationLog", {
        level,
        message,
        ...context,
    });

    // Add to current transaction for correlation
    if (context) {
        addTransactionAttributes(context);
    }
}

/**
 * Structured logger interface
 */
export const logger = {
    /**
     * Trace-level logging (most verbose, disabled in production)
     * Use for detailed debugging information
     */
    logTrace: (message: string, context?: LogContext) => {
        log("trace", message, context);
    },

    /**
     * Debug-level logging (verbose, disabled in production)
     * Use for development/troubleshooting
     */
    debug: (message: string, context?: LogContext) => {
        log("debug", message, context);
    },

    /**
     * Info-level logging (standard application flow)
     * Use for significant events (user actions, system events)
     */
    info: (message: string, context?: LogContext) => {
        log("info", message, context);
    },

    /**
     * Warning-level logging (degraded performance, recoverable errors)
     * Use when something unexpected happens but app continues
     */
    warn: (message: string, context?: LogContext) => {
        log("warn", message, context);
    },

    /**
     * Error-level logging (failures, exceptions)
     * Use for errors that impact functionality
     */
    error: (message: string, error?: unknown, context?: LogContext) => {
        const errorContext: LogContext = {
            ...context,
            errorMessage:
                error instanceof Error ? error.message : String(error),
            errorStack:
                error instanceof Error && process.env.NODE_ENV !== "production"
                    ? error.stack
                    : undefined,
        };

        log("error", message, errorContext);

        // Also send to New Relic error tracking
        if (error instanceof Error) {
            noticeError(error, errorContext);
        }
    },

    /**
     * Performance logging (operation timing)
     * Use to track duration of key operations
     * Always sends to New Relic for observability, console output filtered by threshold
     */
    perf: (operation: string, duration: number, context?: LogContext) => {
        const perfContext: LogContext = {
            ...context,
            operation,
            duration,
            durationSeconds: (duration / 1000).toFixed(2),
        };

        // Always send to New Relic as custom metric (no threshold)
        recordMetric(`Custom/${operation}/Duration`, duration);

        // Send as custom event for detailed querying
        sendToNewRelic("PerformanceMetric", {
            operation,
            duration,
            durationSeconds: Number((duration / 1000).toFixed(2)),
            ...context,
        });

        // Only log to console if duration exceeds threshold (reduces noise)
        const consoleThreshold = 500; // 500ms for console output
        if (
            duration >= consoleThreshold ||
            process.env.NODE_ENV !== "production"
        ) {
            log("perf", `${operation} completed`, perfContext);
        }
    },

    /**
     * Automatically trace function execution time
     * Wraps async function and logs performance
     */
    traceAsync: async <T>(
        name: string,
        fn: () => Promise<T>,
        context?: LogContext
    ): Promise<T> => {
        const start = performance.now();

        try {
            const result = await fn();
            const duration = performance.now() - start;

            logger.perf(name, duration, {
                ...context,
                success: true,
            });

            return result;
        } catch (error) {
            const duration = performance.now() - start;

            logger.error(`${name} failed`, error, {
                ...context,
                duration,
                success: false,
            });

            throw error;
        }
    },

    /**
     * Create performance timer
     * Returns function to end timing and log result
     */
    startTimer: (operation: string, context?: LogContext) => {
        const start = performance.now();

        return (additionalContext?: LogContext) => {
            const duration = performance.now() - start;
            logger.perf(operation, duration, {
                ...context,
                ...additionalContext,
            });
        };
    },
};

/**
 * Type-safe context builder for structured logging
 */
export function createLogContext(
    userId?: string,
    chatId?: string,
    requestId?: string
): LogContext {
    return {
        userId,
        chatId,
        requestId,
    };
}

/**
 * Generate a unique request ID for correlation
 * Uses crypto.randomUUID() for unique, collision-resistant IDs
 */
function generateRequestId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        // Fallback for environments without crypto.randomUUID
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}

/**
 * Extract request context from Next.js Request object
 * Generates a request ID if not present in headers for correlation
 */
export function extractRequestContext(request?: Request): LogContext {
    if (!request) {
        return {};
    }

    const url = new URL(request.url);
    // Use existing request ID from headers or generate a new one
    const requestId =
        request.headers.get("x-request-id") ||
        request.headers.get("x-vercel-id") ||
        generateRequestId();

    return {
        requestId,
        method: request.method,
        path: url.pathname,
        query: url.search || undefined,
    };
}
