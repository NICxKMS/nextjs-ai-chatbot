/**
 * Centralized Logging Module
 * @module new-arch/lib/log
 *
 * Server-side: Records structured events on the active OpenTelemetry span.
 * Client-side: Console logging (errors surfaced via UI toasts where appropriate).
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogAttrs = Record<string, unknown>;

// Environment detection
const isDev = process.env.NODE_ENV === "development";

/**
 * Core logging function
 */
function log(
    level: LogLevel,
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    // In production server-side, use OpenTelemetry when available
    // For now, use console logging
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Format error details
    let errorInfo = "";
    if (detail instanceof Error) {
        errorInfo = ` - ${detail.name}: ${detail.message}`;
        if (isDev && detail.stack) {
            errorInfo += `\n${detail.stack}`;
        }
    } else if (detail !== undefined) {
        errorInfo = ` - ${JSON.stringify(detail)}`;
    }

    // Add attributes if present
    let attrInfo = "";
    if (attrs && Object.keys(attrs).length > 0) {
        attrInfo = ` ${JSON.stringify(attrs)}`;
    }

    const logMessage = `${prefix} ${message}${errorInfo}${attrInfo}`;

    switch (level) {
        case "debug":
            if (isDev) {
                console.debug(logMessage);
            }
            break;
        case "info":
            console.info(logMessage);
            break;
        case "warn":
            console.warn(logMessage);
            break;
        case "error":
            console.error(logMessage);
            break;
        default:
            console.log(logMessage);
    }
}

/**
 * Log a debug message (development only)
 */
export function logDebug(
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    log("debug", message, detail, attrs);
}

/**
 * Log an info message
 */
export function logInfo(
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    log("info", message, detail, attrs);
}

/**
 * Log a warning message
 */
export function logWarn(
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    log("warn", message, detail, attrs);
}

/**
 * Log an error message
 */
export function logError(
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    log("error", message, detail, attrs);
}

/**
 * Log a performance metric
 */
export function logMetric(
    name: string,
    value: number,
    unit: string,
    attrs?: LogAttrs
): void {
    log("info", `[METRIC] ${name}: ${value}${unit}`, undefined, attrs);
}
