/**
 * Request ID / Correlation ID Utilities
 *
 * Generates and manages unique request identifiers for tracing
 * requests across the system. Edge-runtime compatible.
 *
 * @module lib/middleware/request-id
 */

import type { NextRequest } from "next/server";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Header name for request ID (X-Request-ID is de facto standard) */
export const REQUEST_ID_HEADER = "X-Request-ID";

/** Alternative header name for correlation ID */
export const CORRELATION_ID_HEADER = "X-Correlation-ID";

/** Prefix for generated request IDs */
const REQUEST_ID_PREFIX = "req";

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique request ID.
 *
 * Uses crypto.randomUUID() which is available in Edge runtime.
 * Format: req_<uuid> for easy identification in logs.
 *
 * @returns Unique request ID string
 *
 * @example
 * ```typescript
 * const id = generateRequestId();
 * // => "req_550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateRequestId(): string {
    return `${REQUEST_ID_PREFIX}_${crypto.randomUUID()}`;
}

/**
 * Generate a short request ID (for lighter logging).
 *
 * Uses first 8 chars of UUID for brevity while maintaining
 * reasonable uniqueness for request tracing.
 *
 * @returns Short request ID string
 *
 * @example
 * ```typescript
 * const id = generateShortRequestId();
 * // => "req_550e8400"
 * ```
 */
export function generateShortRequestId(): string {
    const uuid = crypto.randomUUID();
    return `${REQUEST_ID_PREFIX}_${uuid.slice(0, 8)}`;
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Extract request ID from incoming request headers.
 *
 * Checks both X-Request-ID and X-Correlation-ID headers.
 * Useful for propagating IDs from upstream services.
 *
 * @param request - Next.js request object
 * @returns Existing request ID or undefined
 */
export function getRequestIdFromHeaders(
    request: NextRequest
): string | undefined {
    return (
        request.headers.get(REQUEST_ID_HEADER) ??
        request.headers.get(CORRELATION_ID_HEADER) ??
        undefined
    );
}

/**
 * Get or create a request ID for the given request.
 *
 * If the request already has a request ID header, returns that.
 * Otherwise generates a new one. This allows for request ID
 * propagation from upstream proxies/load balancers.
 *
 * @param request - Next.js request object
 * @returns Request ID (existing or newly generated)
 */
export function getOrCreateRequestId(request: NextRequest): string {
    const existingId = getRequestIdFromHeaders(request);
    return existingId ?? generateRequestId();
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Add request ID headers to a Headers object.
 *
 * Sets both X-Request-ID and X-Correlation-ID for compatibility
 * with different tracing systems.
 *
 * @param headers - Headers object to modify
 * @param requestId - Request ID to set
 */
export function setRequestIdHeaders(headers: Headers, requestId: string): void {
    headers.set(REQUEST_ID_HEADER, requestId);
    headers.set(CORRELATION_ID_HEADER, requestId);
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request context with correlation ID for logging.
 *
 * Use this type when passing request context through the application.
 */
export interface RequestContext {
    /** Unique request identifier */
    requestId: string;
    /** Request start timestamp */
    startTime: number;
    /** Request path */
    path: string;
    /** Request method */
    method: string;
}

/**
 * Create a request context object for logging and tracing.
 *
 * @param request - Next.js request object
 * @param requestId - Request ID to use
 * @returns Request context object
 */
export function createRequestContext(
    request: NextRequest,
    requestId: string
): RequestContext {
    return {
        requestId,
        startTime: Date.now(),
        path: request.nextUrl.pathname,
        method: request.method,
    };
}
