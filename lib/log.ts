/**
 * Centralized Logging Module
 *
 * Server-side: Records structured events on the active OpenTelemetry span.
 * Client-side: No-op (errors are surfaced via UI toasts where appropriate).
 *
 * Features:
 * - Automatic request context injection (requestId, userId)
 * - Error tracking with stack traces
 * - Performance metrics logging
 * - Environment-aware logging levels
 */

import { type Attributes, SpanStatusCode, trace } from "@opentelemetry/api";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogAttrs = Record<string, unknown>;

// Environment detection
const isServer = typeof window === "undefined";

// Request context injection for server-side correlation
let getRequestContextFn:
    | (() => { requestId: string; userId?: string } | undefined)
    | undefined;

/**
 * Inject the request context getter function (server-side only).
 * Called from instrumentation or server-side initialization.
 */
export function injectRequestContextGetter(
    getter: () => { requestId: string; userId?: string } | undefined
): void {
    getRequestContextFn = getter;
}

/** Convert values to OTel-compatible attribute values */
function toAttributeValue(
    value: unknown
): string | number | boolean | undefined {
    if (value === null || value === undefined) {
        return;
    }
    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value;
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/** Core logging function */
function log(
    level: LogLevel,
    message: string,
    detail?: unknown,
    attrs?: LogAttrs
): void {
    // Skip client-side logging
    if (!isServer) {
        return;
    }

    const span = trace.getActiveSpan();
    if (!span) {
        return;
    }

    const attributes: Attributes = {
        "log.level": level,
        "log.message": message,
    };

    // Auto-inject request context
    if (getRequestContextFn) {
        const ctx = getRequestContextFn();
        if (ctx) {
            if (!attrs?.requestId && ctx.requestId) {
                attributes["log.requestId"] = ctx.requestId;
            }
            if (!attrs?.userId && ctx.userId) {
                attributes["log.userId"] = ctx.userId;
            }
        }
    }

    // Handle error details
    if (detail instanceof Error) {
        attributes["log.error.name"] = detail.name;
        attributes["log.error.message"] = detail.message;
        if (detail.stack) {
            attributes["log.error.stack"] = detail.stack;
        }
    } else if (detail !== undefined) {
        const v = toAttributeValue(detail);
        if (v !== undefined) {
            attributes["log.detail"] = v;
        }
    }

    // Add custom attributes
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            const v = toAttributeValue(value);
            if (v !== undefined) {
                attributes[`log.${key}`] = v;
            }
        }
    }

    span.addEvent("log", attributes);

    // Mark span as error for error level logs
    if (level === "error") {
        if (detail instanceof Error) {
            span.recordException(detail);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: message || detail.message,
            });
        } else {
            span.setStatus({ code: SpanStatusCode.ERROR, message });
        }
    }
}

// Public API

/** Log informational messages */
export function logInfo(message: string, attrs?: LogAttrs): void {
    log("info", message, undefined, attrs);
}

/** Log warning messages */
export function logWarn(
    message: string,
    detailOrAttrs?: unknown,
    attrs?: LogAttrs
): void {
    // If second param is a plain object and no third param, treat as attrs
    if (
        detailOrAttrs !== null &&
        typeof detailOrAttrs === "object" &&
        !(detailOrAttrs instanceof Error) &&
        !attrs
    ) {
        log("warn", message, undefined, detailOrAttrs as LogAttrs);
    } else {
        log("warn", message, detailOrAttrs, attrs);
    }
}

/** Log error messages with optional error object */
export function logError(
    message: string,
    errorOrAttrs?: unknown,
    attrs?: LogAttrs
): void {
    // If second param is a plain object (not Error) and no third param, treat as attrs
    if (
        errorOrAttrs !== null &&
        typeof errorOrAttrs === "object" &&
        !(errorOrAttrs instanceof Error) &&
        !attrs
    ) {
        log("error", message, undefined, errorOrAttrs as LogAttrs);
    } else {
        log("error", message, errorOrAttrs, attrs);
    }
}

/** Log performance metrics */
export function logPerf(
    operation: string,
    durationMs: number,
    attrs?: LogAttrs
): void {
    log("info", operation, undefined, { ...attrs, durationMs });
}
