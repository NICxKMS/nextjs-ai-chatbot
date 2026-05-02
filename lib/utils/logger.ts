type LogLevel = "debug" | "info" | "warn" | "error"
type LogContext = Record<string, unknown>

interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	[key: string]: unknown
}

const isProduction = process.env.NODE_ENV === "production"

// ANSI color codes for dev console
const LEVEL_COLORS: Record<LogLevel, string> = {
	debug: "\x1b[36m", // cyan
	info: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
}
const RESET = "\x1b[0m"

const CONSOLE_METHODS: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error",
}

function formatJson(level: LogLevel, message: string, context?: LogContext): string {
	const entry: LogEntry = {
		level,
		message,
		timestamp: new Date().toISOString(),
		...context,
	}
	return JSON.stringify(entry)
}

function formatDev(level: LogLevel, message: string, context?: LogContext): void {
	const color = LEVEL_COLORS[level]
	const method = CONSOLE_METHODS[level]
	const timestamp = new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
	const prefix = `${color}[${level.toUpperCase()}]${RESET} ${timestamp}`

	if (context && Object.keys(context).length > 0) {
		console[method](prefix, message, context)
	} else {
		console[method](prefix, message)
	}
}

function log(level: LogLevel, message: string, context?: LogContext): void {
	if (isProduction) {
		const method = CONSOLE_METHODS[level]
		console[method](formatJson(level, message, context))
	} else {
		formatDev(level, message, context)
	}
}

export const logger = {
	debug(message: string, context?: LogContext): void {
		log("debug", message, context)
	},
	info(message: string, context?: LogContext): void {
		log("info", message, context)
	},
	warn(message: string, context?: LogContext): void {
		log("warn", message, context)
	},
	error(message: string, context?: LogContext): void {
		log("error", message, context)
	},
} as const
