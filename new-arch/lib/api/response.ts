/**
 * Response Helpers
 * @module new-arch/lib/api/response
 *
 * Utility functions for creating consistent API responses.
 */

import { AppError } from "../errors";
import { ErrorCodes } from "../errors/codes";
import type {
    ApiErrorResponse,
    ApiResponse,
    CachePolicy,
    PaginatedResponse,
    ResponseMeta,
} from "./types";

// ============================================================================
// Cache Policy Mapping
// ============================================================================

const CACHE_HEADERS: Record<CachePolicy, string> = {
    "private-short": "private, max-age=60",
    "private-medium": "private, max-age=300",
    "private-revalidate":
        "private, max-age=0, s-maxage=10, stale-while-revalidate=30",
    "no-store": "no-store",
    "public-short": "public, max-age=60",
    "public-long": "public, max-age=3600",
};

// ============================================================================
// Success Responses
// ============================================================================

/**
 * Create a JSON success response
 */
export function json<T>(
    data: T,
    options?: {
        status?: number;
        meta?: ResponseMeta;
        cache?: CachePolicy;
        headers?: HeadersInit;
    }
): Response {
    const body: ApiResponse<T> = {
        success: true,
        data,
        ...(options?.meta && { meta: options.meta }),
    };

    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");

    if (options?.cache) {
        headers.set("Cache-Control", CACHE_HEADERS[options.cache]);
    }

    return new Response(JSON.stringify(body), {
        status: options?.status ?? 200,
        headers,
    });
}

/**
 * Create a paginated JSON response
 */
export function paginated<T>(
    data: T[],
    options: {
        cursor?: string | undefined;
        hasMore: boolean;
        cache?: CachePolicy;
        headers?: HeadersInit;
    }
): Response {
    const body: PaginatedResponse<T> = {
        success: true,
        data,
        meta: {
            ...(options.cursor && { cursor: options.cursor }),
            hasMore: options.hasMore,
        },
    };

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (options.cache) {
        headers.set("Cache-Control", CACHE_HEADERS[options.cache]);
    }

    return new Response(JSON.stringify(body), {
        status: 200,
        headers,
    });
}

/**
 * Create a 201 Created response
 */
export function created<T>(
    data: T,
    options?: {
        location?: string;
        headers?: HeadersInit;
    }
): Response {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");

    if (options?.location) {
        headers.set("Location", options.location);
    }

    const body: ApiResponse<T> = {
        success: true,
        data,
    };

    return new Response(JSON.stringify(body), {
        status: 201,
        headers,
    });
}

/**
 * Create a 204 No Content response
 */
export function noContent(): Response {
    return new Response(null, { status: 204 });
}

// ============================================================================
// Error Responses
// ============================================================================

/**
 * Create an error response from AppError
 */
export function error(
    appError: AppError,
    options?: { headers?: HeadersInit }
): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: appError.code,
            message: appError.message,
            ...(Object.keys(appError.context).length > 0 && {
                details: appError.context,
            }),
        },
    };

    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");

    return new Response(JSON.stringify(body), {
        status: appError.statusCode,
        headers,
    });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(message: string, details?: unknown): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.BAD_REQUEST,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    };

    return new Response(JSON.stringify(body), {
        status: 400,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message = "Authentication required"): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.AUTH_REQUIRED,
            message,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 401,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = "Access denied"): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.CHAT_ACCESS_DENIED,
            message,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 403,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Create a 404 Not Found response
 */
export function notFound(resource = "Resource"): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.NOT_FOUND,
            message: `${resource} not found`,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 404,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Create a 429 Rate Limited response
 */
export function rateLimited(retryAfter?: number): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.AI_RATE_LIMITED,
            message: "Too many requests. Please try again later.",
        },
    };

    const headers = new Headers({ "Content-Type": "application/json" });
    if (retryAfter) {
        headers.set("Retry-After", String(retryAfter));
    }

    return new Response(JSON.stringify(body), {
        status: 429,
        headers,
    });
}

/**
 * Create a 500 Internal Server Error response
 */
export function serverError(
    message = "An unexpected error occurred"
): Response {
    const body: ApiErrorResponse = {
        success: false,
        error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message,
        },
    };

    return new Response(JSON.stringify(body), {
        status: 500,
        headers: { "Content-Type": "application/json" },
    });
}

// ============================================================================
// Streaming Responses
// ============================================================================

/**
 * Create a Server-Sent Events (SSE) response
 */
export function stream(
    readable: ReadableStream,
    options?: {
        headers?: HeadersInit;
    }
): Response {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");

    return new Response(readable, {
        status: 200,
        headers,
    });
}

/**
 * Create a streaming JSON response (NDJSON)
 */
export function streamJson(
    readable: ReadableStream,
    options?: {
        headers?: HeadersInit;
    }
): Response {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/x-ndjson");
    headers.set("Cache-Control", "no-cache");

    return new Response(readable, {
        status: 200,
        headers,
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert unknown error to Response
 */
export function fromError(err: unknown): Response {
    const appError = AppError.from(err);
    return error(appError);
}

/**
 * Add CORS headers to a response
 */
export function withCors(response: Response, origin = "*"): Response {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Create OPTIONS response for CORS preflight
 */
export function corsOptions(origin = "*"): Response {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        },
    });
}
