/**
 * API Response Utilities
 *
 * Standardized response helpers for Next.js API routes.
 * Provides consistent error handling and response formatting.
 *
 * @module lib/api/response
 */

import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/lib/errors";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard API response structure.
 */
export interface StandardApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        timestamp: number;
        requestId?: string;
    };
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasMore: boolean;
    nextCursor?: string | null;
    prevCursor?: string | null;
}

/**
 * Paginated API response.
 */
export interface PaginatedApiResponse<T> extends StandardApiResponse<T[]> {
    pagination: PaginationMeta;
}

/**
 * API error handler function type.
 */
export type ApiResponseHandler<T> = (
    request: Request
) => Promise<T | NextResponse>;

// =============================================================================
// RESPONSE CREATORS
// =============================================================================

/**
 * Create a standardized success response.
 *
 * @example
 * ```ts
 * return createApiResponse({ user: { id: '1', name: 'John' } });
 * ```
 */
export function createApiResponse<T>(
    data: T,
    options?: {
        status?: number;
        headers?: Record<string, string>;
        requestId?: string;
    }
): NextResponse<StandardApiResponse<T>> {
    const { status = 200, headers = {}, requestId } = options ?? {};

    return NextResponse.json(
        {
            success: true,
            data,
            meta: {
                timestamp: Date.now(),
                requestId,
            },
        },
        {
            status,
            headers,
        }
    );
}

/**
 * Create a standardized error response.
 *
 * @example
 * ```ts
 * return createErrorResponse('validation:invalid_input', 'Invalid email format', 400);
 * ```
 */
export function createErrorResponse(
    code: string,
    message: string,
    status: number,
    options?: {
        details?: Record<string, unknown>;
        headers?: Record<string, string>;
        requestId?: string;
    }
): NextResponse<StandardApiResponse<never>> {
    const { details, headers = {}, requestId } = options ?? {};

    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details,
            },
            meta: {
                timestamp: Date.now(),
                requestId,
            },
        },
        {
            status,
            headers,
        }
    );
}

/**
 * Create a paginated response.
 *
 * @example
 * ```ts
 * return createPaginatedResponse(users, {
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   hasMore: true,
 * });
 * ```
 */
export function createPaginatedResponse<T>(
    items: T[],
    pagination: PaginationMeta,
    options?: {
        headers?: Record<string, string>;
        requestId?: string;
    }
): NextResponse<PaginatedApiResponse<T>> {
    const { headers = {}, requestId } = options ?? {};

    return NextResponse.json(
        {
            success: true,
            data: items,
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasMore: pagination.hasMore,
                nextCursor: pagination.nextCursor,
                prevCursor: pagination.prevCursor,
            },
            meta: {
                timestamp: Date.now(),
                requestId,
            },
        },
        {
            status: 200,
            headers,
        }
    );
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Convert an error to a standardized API error response.
 *
 * @example
 * ```ts
 * try {
 *   // ... operation
 * } catch (error) {
 *   return handleApiError(error);
 * }
 * ```
 */
export function handleApiError(
    error: unknown,
    options?: {
        defaultMessage?: string;
        defaultStatus?: number;
        requestId?: string;
        logError?: boolean;
    }
): NextResponse<StandardApiResponse<never>> {
    const {
        defaultMessage = "An unexpected error occurred",
        defaultStatus = 500,
        requestId,
        logError = true,
    } = options ?? {};

    // Log error in development or if explicitly requested
    if (logError && process.env.NODE_ENV !== "production") {
        console.error("[API Error]", error);
    }

    // Handle AppError
    if (isAppError(error)) {
        return createErrorResponse(
            error.code,
            error.message,
            error.statusCode,
            {
                details: error.context,
                requestId,
            }
        );
    }

    // Handle standard Error
    if (error instanceof Error) {
        return createErrorResponse(
            "internal:error",
            process.env.NODE_ENV === "production"
                ? defaultMessage
                : error.message,
            defaultStatus,
            { requestId }
        );
    }

    // Handle unknown error
    return createErrorResponse(
        "internal:unknown",
        defaultMessage,
        defaultStatus,
        {
            requestId,
        }
    );
}

/**
 * Wrap an API route handler with standardized error handling.
 *
 * @example
 * ```ts
 * export const GET = withApiErrorHandling(async (request) => {
 *   const data = await fetchData();
 *   return createApiResponse(data);
 * });
 * ```
 */
export function withApiErrorHandling<T>(
    handler: ApiResponseHandler<T>,
    options?: {
        defaultMessage?: string;
        logError?: boolean;
    }
): (request: Request) => Promise<NextResponse> {
    return async (request: Request) => {
        const requestId =
            request.headers.get("x-request-id") ?? crypto.randomUUID();

        try {
            const result = await handler(request);

            // If handler returns NextResponse, use it directly
            if (result instanceof NextResponse) {
                return result;
            }

            // Otherwise wrap in success response
            return createApiResponse(result, { requestId });
        } catch (error) {
            return handleApiError(error, {
                ...options,
                requestId,
            });
        }
    };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate request body JSON and return parsed result.
 * Throws AppError on invalid JSON.
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
    try {
        return await request.json();
    } catch {
        throw new AppError({
            code: "validation:invalid_json",
            message: "Invalid JSON in request body",
            statusCode: 400,
            isOperational: true,
        });
    }
}

/**
 * Extract and validate URL search parameters.
 */
export function getSearchParams(
    request: Request,
    params: {
        name: string;
        required?: boolean;
        type?: "string" | "number" | "boolean";
        default?: string | number | boolean;
    }[]
): Record<string, string | number | boolean | undefined> {
    const url = new URL(request.url);
    const result: Record<string, string | number | boolean | undefined> = {};

    for (const param of params) {
        const value = url.searchParams.get(param.name);

        if (value === null) {
            if (param.required && param.default === undefined) {
                throw new AppError({
                    code: "validation:missing_parameter",
                    message: `Missing required parameter: ${param.name}`,
                    statusCode: 400,
                    isOperational: true,
                });
            }
            result[param.name] = param.default;
            continue;
        }

        // Type conversion
        switch (param.type) {
            case "number": {
                const num = Number(value);
                if (Number.isNaN(num)) {
                    throw new AppError({
                        code: "validation:invalid_type",
                        message: `Parameter ${param.name} must be a number`,
                        statusCode: 400,
                        isOperational: true,
                    });
                }
                result[param.name] = num;
                break;
            }
            case "boolean":
                result[param.name] = value === "true" || value === "1";
                break;
            default:
                result[param.name] = value;
        }
    }

    return result;
}

// =============================================================================
// COMMON RESPONSE SHORTCUTS
// =============================================================================

/**
 * Create a 401 Unauthorized response.
 */
export function unauthorizedResponse(
    message = "Authentication required"
): NextResponse<StandardApiResponse<never>> {
    return createErrorResponse("auth:unauthorized", message, 401);
}

/**
 * Create a 403 Forbidden response.
 */
export function forbiddenResponse(
    message = "Access denied"
): NextResponse<StandardApiResponse<never>> {
    return createErrorResponse("auth:forbidden", message, 403);
}

/**
 * Create a 404 Not Found response.
 */
export function notFoundResponse(
    resource = "Resource",
    message?: string
): NextResponse<StandardApiResponse<never>> {
    return createErrorResponse(
        `resource:not_found:${resource.toLowerCase()}`,
        message ?? `${resource} not found`,
        404
    );
}

/**
 * Create a 400 Bad Request response.
 */
export function badRequestResponse(
    message: string,
    details?: Record<string, unknown>
): NextResponse<StandardApiResponse<never>> {
    return createErrorResponse("validation:bad_request", message, 400, {
        details,
    });
}

/**
 * Create a 429 Rate Limited response.
 */
export function rateLimitedResponse(
    retryAfter?: number
): NextResponse<StandardApiResponse<never>> {
    const headers: Record<string, string> = {};
    if (retryAfter) {
        headers["Retry-After"] = String(retryAfter);
    }

    return createErrorResponse(
        "rate_limit:exceeded",
        "Too many requests. Please try again later.",
        429,
        { headers }
    );
}

/**
 * Create a 204 No Content response.
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 });
}
