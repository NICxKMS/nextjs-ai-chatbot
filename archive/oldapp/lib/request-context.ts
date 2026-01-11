import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Request Context - Provides request-scoped data for logging correlation
 *
 * Features:
 * - Unique request ID for tracing
 * - User ID correlation
 * - Request timing
 * - Async-safe context propagation
 */
export type RequestContext = {
    requestId: string;
    userId?: string;
    startTime: number;
    path?: string;
    method?: string;
};

// AsyncLocalStorage for request-scoped context
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a unique request ID
 * Uses UUID v4 for uniqueness
 */
export function generateRequestId(): string {
    return randomUUID();
}

/**
 * Get the current request context
 * Returns undefined if called outside of a request scope
 */
export function getRequestContext(): RequestContext | undefined {
    return requestContextStorage.getStore();
}

/**
 * Get the current request ID
 * Returns undefined if called outside of a request scope
 */
export function getRequestId(): string | undefined {
    return requestContextStorage.getStore()?.requestId;
}

/**
 * Run a function within a request context
 * Creates a new context with a unique request ID
 */
export function runWithRequestContext<T>(
    fn: () => T,
    initialContext?: Partial<RequestContext>
): T {
    const context: RequestContext = {
        requestId: initialContext?.requestId ?? generateRequestId(),
        userId: initialContext?.userId,
        startTime: initialContext?.startTime ?? Date.now(),
        path: initialContext?.path,
        method: initialContext?.method,
    };

    return requestContextStorage.run(context, fn);
}

/**
 * Run an async function within a request context
 * Creates a new context with a unique request ID
 */
export function runWithRequestContextAsync<T>(
    fn: () => Promise<T>,
    initialContext?: Partial<RequestContext>
): Promise<T> {
    const context: RequestContext = {
        requestId: initialContext?.requestId ?? generateRequestId(),
        userId: initialContext?.userId,
        startTime: initialContext?.startTime ?? Date.now(),
        path: initialContext?.path,
        method: initialContext?.method,
    };

    return requestContextStorage.run(context, fn);
}

/**
 * Update the current request context
 * Useful for adding user ID after authentication
 */
export function updateRequestContext(
    updates: Partial<Omit<RequestContext, "requestId" | "startTime">>
): void {
    const current = requestContextStorage.getStore();
    if (current) {
        if (updates.userId !== undefined) {
            current.userId = updates.userId;
        }
        if (updates.path !== undefined) {
            current.path = updates.path;
        }
        if (updates.method !== undefined) {
            current.method = updates.method;
        }
    }
}

/**
 * Get elapsed time since request start in milliseconds
 */
export function getRequestDuration(): number | undefined {
    const ctx = requestContextStorage.getStore();
    if (!ctx) {
        return;
    }
    return Date.now() - ctx.startTime;
}

/**
 * Create request context from HTTP headers
 * Extracts request ID from X-Request-ID header if present
 */
export function createContextFromHeaders(
    headers: Headers,
    method?: string,
    path?: string
): Partial<RequestContext> {
    const requestId = headers.get("x-request-id") ?? generateRequestId();
    return {
        requestId,
        method,
        path,
        startTime: Date.now(),
    };
}

/**
 * Format request context for logging
 */
export function formatRequestContext(ctx?: RequestContext): string {
    if (!ctx) {
        return "[no-context]";
    }

    const parts = [`req=${ctx.requestId.slice(0, 8)}`];

    if (ctx.userId) {
        // Truncate user ID for privacy
        const truncatedUserId = ctx.userId.startsWith("guest:")
            ? `guest:${ctx.userId.slice(6, 14)}...`
            : `${ctx.userId.slice(0, 8)}...`;
        parts.push(`user=${truncatedUserId}`);
    }

    if (ctx.method && ctx.path) {
        parts.push(`${ctx.method} ${ctx.path}`);
    }

    const duration = Date.now() - ctx.startTime;
    parts.push(`${duration}ms`);

    return `[${parts.join(" ")}]`;
}
