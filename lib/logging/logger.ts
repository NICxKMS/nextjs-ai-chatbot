/**
 * Logging Module
 * @module lib/logging/logger
 * 
 * Core logger with:
 * - Log levels (debug, info, warn, error)
 * - Request context attachment
 * - Structured logging format
 * - Development vs production modes
 */

// Node.js process type declaration
declare const process: {
  env: {
    NODE_ENV?: string;
    LOG_LEVEL?: string;
  };
};

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level names for serialization
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

/**
 * Context attached to log entries
 */
export interface LogContext {
  /** Request correlation ID */
  requestId?: string;
  /** Authenticated user ID */
  userId?: string;
  /** Additional context fields */
  [key: string]: unknown;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Get minimum log level from environment
 */
function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  switch (envLevel) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    default:
      // Debug in dev, info in production
      return process.env.NODE_ENV === 'development'
        ? LogLevel.DEBUG
        : LogLevel.INFO;
  }
}

/**
 * Check if running in development mode
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Logger class with level-based filtering and structured output
 * 
 * @example
 * ```ts
 * import { logger } from '@/lib/logging';
 * 
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Operation failed', error, { requestId: 'abc' });
 * 
 * // With request context
 * const reqLogger = logger.withContext({ requestId: 'xyz' });
 * reqLogger.info('Processing request');
 * ```
 */
export class Logger {
  private minLevel: LogLevel;
  private baseContext: LogContext;

  constructor(context: LogContext = {}) {
    this.minLevel = getMinLevel();
    this.baseContext = context;
  }

  /**
   * Create a child logger with additional context
   */
  withContext(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }

  /**
   * Log debug message (development only by default)
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    // Skip if below minimum level
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      message,
    };

    // Merge contexts
    const mergedContext = { ...this.baseContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    // Attach error details
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(isDev && error.stack && { stack: error.stack }),
      };
    }

    // Output based on level and environment
    this.output(level, entry);
  }

  /**
   * Output log entry to appropriate destination
   */
  private output(level: LogLevel, entry: LogEntry): void {
    const serialized = isDev
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(serialized);
        break;
      case LogLevel.INFO:
        console.info(serialized);
        break;
      case LogLevel.WARN:
        console.warn(serialized);
        break;
      case LogLevel.ERROR:
        console.error(serialized);
        break;
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
