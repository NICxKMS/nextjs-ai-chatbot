/**
 * Middleware Composition Utility
 *
 * Composes multiple middleware functions into a single middleware.
 * Each middleware runs in order until one returns a response.
 *
 * @example
 * ```ts
 * export const middleware = composeMiddleware(
 *   requestIdMiddleware,
 *   rateLimitMiddleware,
 *   securityHeadersMiddleware
 * );
 * ```
 */

import {
    type NextFetchEvent,
    type NextRequest,
    NextResponse,
} from "next/server";
import { getClientIp } from "./request-id";
import type { MiddlewareContext, MiddlewareFn } from "./types";

/**
 * Create initial middleware context.
 * This context is passed through all middleware functions.
 */
function createContext(request: NextRequest): MiddlewareContext {
    const existingId = request.headers.get("x-request-id");
    const requestId = existingId || crypto.randomUUID();

    return {
        requestId,
        clientIp: getClientIp(request),
        startTime: Date.now(),
        responseHeaders: new Headers(),
    };
}

/**
 * Apply accumulated response headers to the final response.
 */
function applyResponseHeaders(
    response: NextResponse,
    context: MiddlewareContext
): NextResponse {
    // Add request ID to response
    response.headers.set("x-request-id", context.requestId);

    // Apply accumulated headers from middlewares
    context.responseHeaders.forEach((value, key) => {
        response.headers.set(key, value);
    });

    return response;
}

/**
 * Compose multiple middleware functions into a single middleware.
 *
 * Middlewares are executed in order. If a middleware returns a response,
 * the chain short-circuits and that response is returned. If a middleware
 * returns undefined, execution continues to the next middleware.
 *
 * @param middlewares - Array of middleware functions to compose
 * @returns Composed middleware function for Next.js
 */
export function composeMiddleware(
    ...middlewares: MiddlewareFn[]
): (request: NextRequest, event: NextFetchEvent) => Promise<NextResponse> {
    return async (
        request: NextRequest,
        event: NextFetchEvent
    ): Promise<NextResponse> => {
        const context = createContext(request);

        // Run each middleware in sequence
        for (const middleware of middlewares) {
            const result = await middleware(request, event, context);

            if (result) {
                // Short-circuit: middleware returned a response
                if (result instanceof NextResponse) {
                    return applyResponseHeaders(result, context);
                }
                // Handle raw Response
                const nextResponse = new NextResponse(result.body, {
                    status: result.status,
                    statusText: result.statusText,
                    headers: result.headers,
                });
                return applyResponseHeaders(nextResponse, context);
            }
        }

        // All middlewares passed, continue to origin
        // Clone request with request ID header
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-request-id", context.requestId);

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

        return applyResponseHeaders(response, context);
    };
}

/**
 * Create a middleware that only runs for specific routes.
 *
 * @param pattern - RegExp pattern to match routes
 * @param middleware - Middleware to run if pattern matches
 * @returns Wrapped middleware function
 */
export function withRouteMatch(
    pattern: RegExp,
    middleware: MiddlewareFn
): MiddlewareFn {
    return (request, event, context) => {
        const pathname = request.nextUrl.pathname;

        if (pattern.test(pathname)) {
            return middleware(request, event, context);
        }

        return;
    };
}

/**
 * Create a middleware that skips certain routes.
 *
 * @param pattern - RegExp pattern for routes to skip
 * @param middleware - Middleware to run if pattern doesn't match
 * @returns Wrapped middleware function
 */
export function skipRoutes(
    pattern: RegExp,
    middleware: MiddlewareFn
): MiddlewareFn {
    return (request, event, context) => {
        const pathname = request.nextUrl.pathname;

        if (pattern.test(pathname)) {
            return;
        }

        return middleware(request, event, context);
    };
}
