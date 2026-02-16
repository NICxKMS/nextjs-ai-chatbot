/**
 * Structured Logging Utility
 *
 * Provides structured logging with consistent formatting, timestamps, and context.
 * Supports multiple log levels and can be extended for external logging services.
 *
 * @module lib/log
 */

// =============================================================================
// Log Types
// =============================================================================

/**
 * Log level severity types.
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Structured log entry format.
 */
export interface LogEntry {
	/** ISO 8601 timestamp */
	timestamp: string
	/** Log level severity */
	level: LogLevel
	/** Log message */
	message: string
	/** Additional context */
	context: Record<string, unknown> | undefined
	/** Error details if applicable */
	error:
		| {
				name: string
				message: string
				stack: string | undefined
		  }
		| undefined
}

/**
 * Context for request correlation.
 */
export interface LogContext {
	/** Request ID for tracing */
	requestId?: string
	/** User ID for user context */
	userId?: string
	/** Session ID for session context */
	sessionId?: string
	/** Additional context fields */
	[key: string]: unknown
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Minimum log level to output.
 * In production, debug logs are typically suppressed.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
}

/**
 * Get minimum log level from environment or default to 'info'.
 */
function getMinLogLevel(): LogLevel {
	if (typeof process !== "undefined" && process.env.LOG_LEVEL) {
		const level = process.env.LOG_LEVEL as LogLevel
		if (level in LOG_LEVELS) {
			return level
		}
	}
	return process.env.NODE_ENV === "production" ? "info" : "debug"
}

const minLogLevel = getMinLogLevel()

/**
 * Check if a log level should be output.
 */
function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= LOG_LEVELS[minLogLevel]
}

// =============================================================================
// Formatters
// =============================================================================

/**
 * Format a log entry for console output.
 */
function formatConsoleLog(entry: LogEntry): string {
	const { timestamp, level, message, context, error } = entry
	const levelUpper = level.toUpperCase().padEnd(5)

	let output = `[${timestamp}] ${levelUpper} | ${message}`

	if (context && Object.keys(context).length > 0) {
		output += ` | ${JSON.stringify(context)}`
	}

	if (error) {
		output += `\n  Error: ${error.name}: ${error.message}`
		if (error.stack) {
			output += `\n  ${error.stack.split("\n").slice(1, 4).join("\n  ")}`
		}
	}

	return output
}

/**
 * Format a log entry as JSON for structured logging.
 */
function formatJsonLog(entry: LogEntry): string {
	return JSON.stringify(entry)
}

// =============================================================================
// Core Logger
// =============================================================================

/**
 * Create a log entry with all required fields.
 */
function createLogEntry(
	level: LogLevel,
	message: string,
	context?: Record<string, unknown>,
	error?: Error,
): LogEntry {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		context: undefined,
		error: undefined,
	}

	if (context && Object.keys(context).length > 0) {
		entry.context = context
	}

	if (error) {
		entry.error = {
			name: error.name,
			message: error.message,
			stack: error.stack,
		}
	}

	return entry
}

/**
 * Output a log entry to the console.
 */
function outputLog(entry: LogEntry): void {
	if (!shouldLog(entry.level)) {
		return
	}

	const useJson =
		typeof process !== "undefined" && process.env.LOG_FORMAT === "json"
	const formatted = useJson ? formatJsonLog(entry) : formatConsoleLog(entry)

	switch (entry.level) {
		case "debug":
			console.debug(formatted)
			break
		case "info":
			console.info(formatted)
			break
		case "warn":
			console.warn(formatted)
			break
		case "error":
			console.error(formatted)
			break
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Log a debug message.
 * Used for detailed debugging information during development.
 *
 * @param message - The log message
 * @param context - Optional context data
 *
 * @example
 * ```typescript
 * logDebug('Processing request', { requestId: '123', method: 'POST' });
 * ```
 */
export function logDebug(
	message: string,
	context?: Record<string, unknown>,
): void {
	const entry = createLogEntry("debug", message, context)
	outputLog(entry)
}

/**
 * Log an informational message.
 * Used for general operational information.
 *
 * @param message - The log message
 * @param context - Optional context data
 *
 * @example
 * ```typescript
 * logInfo('User logged in', { userId: 'user-123' });
 * ```
 */
export function logInfo(
	message: string,
	context?: Record<string, unknown>,
): void {
	const entry = createLogEntry("info", message, context)
	outputLog(entry)
}

/**
 * Log a warning message.
 * Used for potentially problematic situations that aren't errors.
 *
 * @param message - The log message
 * @param context - Optional context data or error object
 * @param error - Optional error object
 *
 * @example
 * ```typescript
 * logWarn('Rate limit approaching', { userId: 'user-123', requests: 95, limit: 100 });
 * ```
 */
export function logWarn(
	message: string,
	context?: Record<string, unknown>,
	error?: Error,
): void {
	const entry = createLogEntry("warn", message, context, error)
	outputLog(entry)
}

/**
 * Log an error message.
 * Used for errors and exceptions that need attention.
 *
 * @param message - The log message
 * @param error - Optional error object or context
 * @param context - Optional context data
 *
 * @example
 * ```typescript
 * logError('Database connection failed', error, { attempt: 3 });
 * ```
 */
export function logError(
	message: string,
	error?: Error | Record<string, unknown>,
	context?: Record<string, unknown>,
): void {
	let errorObj: Error | undefined
	let contextObj: Record<string, unknown> | undefined

	if (error instanceof Error) {
		errorObj = error
		contextObj = context
	} else if (error) {
		contextObj = error
	}

	const entry = createLogEntry("error", message, contextObj, errorObj)
	outputLog(entry)
}

/**
 * Log a performance metric.
 * Used for timing and performance monitoring.
 *
 * @param operation - The operation name
 * @param durationMs - Duration in milliseconds
 * @param context - Optional additional context
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * await performOperation();
 * logPerf('performOperation', Date.now() - start);
 * ```
 */
export function logPerf(
	operation: string,
	durationMs: number,
	context?: Record<string, unknown>,
): void {
	const entry = createLogEntry("info", `PERF: ${operation}`, {
		operation,
		durationMs,
		...context,
	})
	outputLog(entry)
}

// =============================================================================
// Logger Class for Context-Aware Logging
// =============================================================================

/**
 * Logger class that maintains context across multiple log calls.
 * Useful for request-scoped logging with correlation IDs.
 *
 * @example
 * ```typescript
 * const logger = new Logger({ requestId: 'req-123', userId: 'user-456' });
 * logger.info('Processing request');
 * logger.error('Failed to process', error);
 * ```
 */
export class Logger {
	private context: LogContext

	constructor(context: LogContext = {}) {
		this.context = context
	}

	/**
	 * Create a child logger with additional context.
	 */
	child(additionalContext: LogContext): Logger {
		return new Logger({ ...this.context, ...additionalContext })
	}

	/**
	 * Add context to the logger.
	 */
	setContext(context: LogContext): void {
		this.context = { ...this.context, ...context }
	}

	/**
	 * Log a debug message with logger context.
	 */
	debug(message: string, context?: Record<string, unknown>): void {
		logDebug(message, { ...this.context, ...context })
	}

	/**
	 * Log an info message with logger context.
	 */
	info(message: string, context?: Record<string, unknown>): void {
		logInfo(message, { ...this.context, ...context })
	}

	/**
	 * Log a warning message with logger context.
	 */
	warn(
		message: string,
		context?: Record<string, unknown>,
		error?: Error,
	): void {
		logWarn(message, { ...this.context, ...context }, error)
	}

	/**
	 * Log an error message with logger context.
	 */
	error(
		message: string,
		error?: Error | Record<string, unknown>,
		context?: Record<string, unknown>,
	): void {
		if (error instanceof Error) {
			logError(message, error, { ...this.context, ...context })
		} else {
			logError(message, { ...this.context, ...error, ...context })
		}
	}

	/**
	 * Log a performance metric with logger context.
	 */
	perf(
		operation: string,
		durationMs: number,
		context?: Record<string, unknown>,
	): void {
		logPerf(operation, durationMs, { ...this.context, ...context })
	}
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Time an async operation and log the result.
 *
 * @param operation - Operation name
 * @param fn - Async function to time
 * @param context - Optional context
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await timeAsync('fetchUser', () => getUser(id));
 * ```
 */
export async function timeAsync<T>(
	operation: string,
	fn: () => Promise<T>,
	context?: Record<string, unknown>,
): Promise<T> {
	const start = Date.now()
	try {
		const result = await fn()
		logPerf(operation, Date.now() - start, { ...context, success: true })
		return result
	} catch (error) {
		logPerf(operation, Date.now() - start, { ...context, success: false })
		throw error
	}
}

/**
 * Time a synchronous operation and log the result.
 *
 * @param operation - Operation name
 * @param fn - Function to time
 * @param context - Optional context
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = timeSync('processData', () => processData(data));
 * ```
 */
export function timeSync<T>(
	operation: string,
	fn: () => T,
	context?: Record<string, unknown>,
): T {
	const start = Date.now()
	try {
		const result = fn()
		logPerf(operation, Date.now() - start, { ...context, success: true })
		return result
	} catch (error) {
		logPerf(operation, Date.now() - start, { ...context, success: false })
		throw error
	}
}

// =============================================================================
// Request Context Integration
// =============================================================================

/**
 * Type for request context getter function.
 * Returns request context for log correlation.
 * Uses Record<string, unknown> to be compatible with various context types.
 */
export type RequestContextGetter = () => Record<string, unknown> | undefined

/**
 * Stored request context getter for log correlation.
 * Set during instrumentation initialization.
 */
let requestContextGetter: RequestContextGetter | undefined

/**
 * Inject a request context getter function for log correlation.
 * Called during server instrumentation to enable request-scoped logging.
 *
 * @param getter - Function that returns the current request context
 *
 * @example
 * ```typescript
 * // In instrumentation.ts
 * import { getRequestContext } from './lib/api/context';
 * import { injectRequestContextGetter } from './lib/log';
 *
 * injectRequestContextGetter(getRequestContext);
 * ```
 */
export function injectRequestContextGetter(getter: RequestContextGetter): void {
	requestContextGetter = getter
}

/**
 * Get the current request context for log correlation.
 * Returns undefined if no context getter has been injected.
 *
 * @returns Current request context or undefined
 */
export function getCurrentRequestContext(): LogContext | undefined {
	return requestContextGetter?.()
}
