/**
 * Request Logging Middleware
 *
 * Logs request information at the Edge.
 * Uses console.log which is captured by Vercel/Edge providers.
 *
 * Note: This is lightweight logging for Edge runtime.
 * Full structured logging happens in Node.js runtime.
 */

import type { NextFetchEvent, NextRequest } from "next/server";
import type { MiddlewareContext, MiddlewareFn } from "./types";

/**
 * Log levels for edge logging
 */
type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Edge log entry structure
 */
type EdgeLogEntry = {
    /** Timestamp in ISO format */
    timestamp: string;

    /** Log level */
    level: LogLevel;

    /** Log message */
    message: string;

    /** Request ID for correlation */
    requestId: string;

    /** HTTP method */
    method: string;

    /** Request path */
    path: string;

    /** Client IP */
    clientIp: string;

    /** Additional metadata */
    meta?: Record<string, unknown> | undefined;
};

/**
 * Format log entry as JSON string.
 */
function formatLog(entry: EdgeLogEntry): string {
    return JSON.stringify(entry);
}

/**
 * Options for edge logging
 */
type EdgeLogOptions = {
    level: LogLevel;
    message: string;
    request: NextRequest;
    context: MiddlewareContext;
    meta?: Record<string, unknown> | undefined;
};

/**
 * Log at edge level.
 * Uses console.log for Vercel Edge runtime compatibility.
 */
function edgeLog(options: EdgeLogOptions): void {
    const { level, message, request, context, meta } = options;
    const entry: EdgeLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        requestId: context.requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        clientIp: context.clientIp,
        meta,
    };

    // Use appropriate console method
    switch (level) {
        case "error":
            console.error(formatLog(entry));
            break;
        case "warn":
            console.warn(formatLog(entry));
            break;
        case "debug":
            console.debug(formatLog(entry));
            break;
        default:
            console.log(formatLog(entry));
    }
}

/**
 * Check if logging is enabled.
 * Can be controlled via environment variable.
 */
function isLoggingEnabled(): boolean {
    // Disable verbose logging in production unless explicitly enabled
    if (process.env.NODE_ENV === "production") {
        return process.env.EDGE_LOGGING_ENABLED === "true";
    }
    return true;
}

/**
 * Logging middleware.
 *
 * Logs incoming requests for observability.
 * Uses waitUntil to log without blocking response.
 *
 * @returns undefined to continue chain
 */
export const loggingMiddleware: MiddlewareFn = (
    request: NextRequest,
    event: NextFetchEvent,
    context: MiddlewareContext
) => {
    if (!isLoggingEnabled()) {
        return;
    }

    // Log request start
    edgeLog({
        level: "info",
        message: "Request received",
        request,
        context,
        meta: {
            userAgent: request.headers.get("user-agent") || undefined,
            referer: request.headers.get("referer") || undefined,
            routeTier: context.routeTier,
        },
    });

    // Use waitUntil to log completion without blocking
    event.waitUntil(
        Promise.resolve().then(() => {
            const duration = Date.now() - context.startTime;

            edgeLog({
                level: "info",
                message: "Request processed",
                request,
                context,
                meta: {
                    durationMs: duration,
                    rateLimited: context.rateLimited,
                },
            });
        })
    );

    return;
};

/**
 * Log an error at edge level.
 * Can be called from other middlewares.
 */
export function logEdgeError(
    error: Error,
    request: NextRequest,
    context: MiddlewareContext
): void {
    edgeLog({
        level: "error",
        message: error.message,
        request,
        context,
        meta: {
            errorName: error.name,
            stack: error.stack,
        },
    });
}

/**
 * Log a warning at edge level.
 */
export function logEdgeWarning(
    message: string,
    request: NextRequest,
    context: MiddlewareContext,
    meta?: Record<string, unknown>
): void {
    edgeLog({ level: "warn", message, request, context, meta });
}
