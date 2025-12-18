/**
 * Request ID Middleware
 *
 * Generates and propagates unique request IDs for tracing.
 * Uses Web Crypto API (Edge-compatible).
 *
 * Features:
 * - Generates UUID v4 if no existing ID
 * - Preserves existing X-Request-ID from upstream proxy
 * - Adds ID to request headers for downstream services
 * - Adds ID to response headers for client correlation
 */

import { type NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext, MiddlewareFn } from "./types";

/**
 * Header name for request ID
 */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Extract client IP from request headers.
 * Checks common proxy headers in order of preference.
 *
 * @param request - Incoming request
 * @returns Client IP address or "unknown"
 */
export function getClientIp(request: NextRequest | Request): string {
    // Check X-Forwarded-For (most common, set by proxies/load balancers)
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first (client IP)
        const firstIp = forwardedFor.split(",")[0]?.trim();
        if (firstIp) {
            return firstIp;
        }
    }

    // Check X-Real-IP (Nginx)
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Check CF-Connecting-IP (Cloudflare)
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) {
        return cfIp;
    }

    // Check True-Client-IP (Akamai, Cloudflare Enterprise)
    const trueClientIp = request.headers.get("true-client-ip");
    if (trueClientIp) {
        return trueClientIp;
    }

    return "unknown";
}

/**
 * Get request ID from request headers or generate a new one.
 *
 * @param request - Incoming request
 * @returns Request ID (existing or newly generated)
 */
export function getRequestId(request: NextRequest): string {
    const existingId = request.headers.get(REQUEST_ID_HEADER);
    return existingId || crypto.randomUUID();
}

/**
 * Request ID middleware.
 *
 * This middleware:
 * 1. Extracts or generates a request ID
 * 2. Stores it in context for downstream middlewares
 * 3. The compose function handles adding it to request/response headers
 *
 * @returns undefined to continue chain (ID is already in context)
 */
export const requestIdMiddleware: MiddlewareFn = (
    _request: NextRequest,
    _event,
    _context: MiddlewareContext
) => {
    // Request ID is already generated in compose.ts createContext()
    // This middleware exists for explicit composition ordering
    // and potential future enhancements

    return;
};

/**
 * Create a NextResponse.next() with request ID header.
 * Utility for middlewares that need to pass through with ID.
 *
 * @param request - Original request
 * @param context - Middleware context with request ID
 * @returns NextResponse with request ID header
 */
export function nextWithRequestId(
    request: NextRequest,
    context: MiddlewareContext
): NextResponse {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, context.requestId);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}
