/**
 * Logger Utility
 *
 * Simple structured logging utility for client-side and server-side logging.
 * Used by ai-elements components for debugging and error tracking.
 *
 * @module lib/utils/logger
 */

type LogLevel = "debug" | "info" | "warn" | "error"

type LogContext = Record<string, unknown>

interface LoggerOptions {
	context?: LogContext
	prefix?: string
}

/**
 * Formats a log message with timestamp and optional context.
 */
function formatMessage(
	level: LogLevel,
	message: string,
	context?: LogContext,
): string {
	const timestamp = new Date().toISOString()
	const contextStr = context ? ` ${JSON.stringify(context)}` : ""
	return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

/**
 * Logger instance with chainable methods for structured logging.
 */
class Logger {
	private context: LogContext
	private prefix: string

	constructor(options: LoggerOptions = {}) {
		this.context = options.context ?? {}
		this.prefix = options.prefix ?? ""
	}

	private shouldLog(level: LogLevel): boolean {
		if (typeof window === "undefined") {
			return true // Server-side: always log
		}
		// Client-side: respect log level based on environment
		const isDev = process.env.NODE_ENV === "development"
		if (level === "debug") return isDev
		return true
	}

	private log(level: LogLevel, message: string, context?: LogContext): void {
		if (!this.shouldLog(level)) return

		const fullMessage = this.prefix
			? `[${this.prefix}] ${message}`
			: message
		const mergedContext = { ...this.context, ...context }
		const formatted = formatMessage(level, fullMessage, mergedContext)

		switch (level) {
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

	/**
	 * Log a debug message (only in development).
	 */
	debug(message: string, context?: LogContext): void {
		this.log("debug", message, context)
	}

	/**
	 * Log an info message.
	 */
	info(message: string, context?: LogContext): void {
		this.log("info", message, context)
	}

	/**
	 * Log a warning message.
	 */
	warn(message: string, context?: LogContext): void {
		this.log("warn", message, context)
	}

	/**
	 * Log an error message.
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		const errorContext = error
			? { ...context, error: error.message, stack: error.stack }
			: context
		this.log("error", message, errorContext)
	}

	/**
	 * Create a child logger with additional context.
	 */
	child(options: LoggerOptions = {}): Logger {
		return new Logger({
			context: { ...this.context, ...options.context },
			prefix: options.prefix ?? this.prefix,
		})
	}
}

/**
 * Default logger instance.
 */
export const logger = new Logger()

/**
 * Create a new logger with custom options.
 */
export function createLogger(options?: LoggerOptions): Logger {
	return new Logger(options)
}
