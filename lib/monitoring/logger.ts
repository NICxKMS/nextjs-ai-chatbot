import "server-only";

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
];

/**
 * Get New Relic agent (lazy loaded, optional)
 */
function getNewRelicAgent() {
	try {
		// Dynamic require for optional New Relic dependency
		return require("newrelic");
	} catch {
		return null;
	}
}

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
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		newrelic.recordCustomEvent(eventType, attributes);
	} catch (err) {
		// Silently fail if New Relic is unavailable
		console.error("Failed to send event to New Relic:", err);
	}
}

/**
 * Add custom attributes to current New Relic transaction
 */
function addTransactionAttributes(attributes: Record<string, unknown>) {
	const newrelic = getNewRelicAgent();
	if (!newrelic) {
		return;
	}

	try {
		// Check if we're in an active transaction to avoid warnings
		const transaction = newrelic.getTransaction();
		if (!transaction || !transaction.isActive()) {
			// No active transaction - this is normal for background tasks
			// Just skip attribute addition silently
			return;
		}

		for (const [key, value] of Object.entries(attributes)) {
			// Only add primitive values (New Relic limitation)
			if (
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				newrelic.addCustomAttribute(key, value);
			}
		}
	} catch {
		// Silently fail - don't pollute logs with New Relic errors
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

	// Send to New Relic as custom event for advanced querying
	if (level === "error" || level === "warn" || level === "perf") {
		sendToNewRelic("ApplicationLog", {
			level,
			message,
			...context,
		});
	}

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
		const newrelic = getNewRelicAgent();
		if (newrelic && error instanceof Error) {
			try {
				newrelic.noticeError(error, errorContext);
			} catch {
				// Silently fail
			}
		}
	},

	/**
	 * Performance logging (operation timing)
	 * Use to track duration of key operations
	 */
	perf: (operation: string, duration: number, context?: LogContext) => {
		// Only log if duration exceeds threshold or in development
		const threshold = 1000; // 1 second
		if (duration < threshold && process.env.NODE_ENV === "production") {
			return;
		}

		const perfContext: LogContext = {
			...context,
			operation,
			duration,
			durationSeconds: (duration / 1000).toFixed(2),
		};

		log("perf", `${operation} completed`, perfContext);

		// Send as custom metric to New Relic
		const newrelic = getNewRelicAgent();
		if (newrelic) {
			try {
				newrelic.recordMetric(`Custom/${operation}/Duration`, duration);
			} catch {
				// Silently fail
			}
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
 * Extract request context from Next.js Request object
 */
export function extractRequestContext(request?: Request): LogContext {
	if (!request) {
		return {};
	}

	const url = new URL(request.url);
	const requestId = request.headers.get("x-request-id") || undefined;

	return {
		requestId,
		method: request.method,
		path: url.pathname,
		query: url.search || undefined,
	};
}
