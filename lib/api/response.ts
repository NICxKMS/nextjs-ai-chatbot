/**
 * API Response Builders
 *
 * Standardized response builders for consistent API responses across all endpoints.
 * Provides success, error, paginated, and streaming response helpers.
 *
 * @module lib/api/response
 */

import { isAppError } from "@/lib/errors"
import type {
	ApiError,
	ApiResponse,
	PaginatedResponse,
	PaginationMetadata,
} from "@/lib/types"

// =============================================================================
// Response Headers
// =============================================================================

/**
 * Default headers for JSON API responses.
 */
const DEFAULT_JSON_HEADERS = {
	"Content-Type": "application/json",
} as const

/**
 * Creates headers with optional request ID for tracing.
 *
 * @param requestId - Optional request ID to include in headers
 * @returns Headers object with Content-Type and optional X-Request-ID
 */
function createHeaders(requestId?: string): Headers {
	const headers = new Headers(DEFAULT_JSON_HEADERS)
	if (requestId) {
		headers.set("X-Request-ID", requestId)
	}
	return headers
}

// =============================================================================
// Success Response Builders
// =============================================================================

/**
 * Creates a success response with data.
 *
 * @template T - The type of data to include in the response
 * @param data - The data to include in the response
 * @param options - Optional configuration (status, requestId)
 * @returns Next.js Response object with JSON body
 *
 * @example
 * ```typescript
 * // In an API route
 * export async function GET() {
 *   const users = await getUsers();
 *   return success(users);
 * }
 * ```
 */
export function success<T>(
	data: T,
	options?: {
		/** HTTP status code (defaults to 200) */
		status?: number
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const response: ApiResponse<T> = {
		success: true,
		data,
	}

	return new Response(JSON.stringify(response), {
		status: options?.status ?? 200,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a success response with no content (204 No Content).
 * Useful for DELETE operations or other actions that don't return data.
 *
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 204 status
 *
 * @example
 * ```typescript
 * export async function DELETE() {
 *   await deleteItem(id);
 *   return successNoContent();
 * }
 * ```
 */
export function successNoContent(options?: {
	/** Request ID for tracing */
	requestId?: string
}): Response {
	const headers = createHeaders(options?.requestId)
	headers.delete("Content-Type") // 204 should not have content-type

	return new Response(null, {
		status: 204,
		headers,
	})
}

// =============================================================================
// Error Response Builders
// =============================================================================

/**
 * Creates an error response from an error object.
 * Handles both AppError instances and generic Error objects.
 *
 * @param error - The error to convert to a response
 * @param options - Optional configuration (status override, requestId)
 * @returns Next.js Response object with JSON error body
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   try {
 *     const data = await getData();
 *     return success(data);
 *   } catch (error) {
 *     return error(error);
 *   }
 * }
 * ```
 */
export function error(
	error: unknown,
	options?: {
		/** Override HTTP status code */
		status?: number
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	// Handle AppError instances
	if (isAppError(error)) {
		return error.toResponse()
	}

	// Handle generic Error instances
	if (error instanceof Error) {
		const apiError: ApiError = {
			code: "INTERNAL_ERROR",
			message: error.message,
			statusCode: options?.status ?? 500,
		}

		const response: ApiResponse<never> = {
			success: false,
			error: apiError,
		}

		return new Response(JSON.stringify(response), {
			status: options?.status ?? 500,
			headers: createHeaders(options?.requestId),
		})
	}

	// Handle unknown error types
	const apiError: ApiError = {
		code: "INTERNAL_ERROR",
		message: "An unexpected error occurred",
		statusCode: 500,
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	return new Response(JSON.stringify(response), {
		status: 500,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a validation error response with field-level errors.
 *
 * @param message - Error message
 * @param fieldErrors - Record of field names to error messages
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 400 status
 *
 * @example
 * ```typescript
 * if (!email) {
 *   return validationError('Invalid input', { email: 'Email is required' });
 * }
 * ```
 */
export function validationError(
	message: string,
	fieldErrors: Record<string, string[] | string>,
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const apiError: ApiError = {
		code: "VALIDATION_ERROR",
		message,
		details: {
			fieldErrors:
				typeof fieldErrors === "object"
					? Object.fromEntries(
							Object.entries(fieldErrors).map(([key, value]) => [
								key,
								Array.isArray(value) ? value : [value],
							]),
						)
					: {},
		},
		statusCode: 400,
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	return new Response(JSON.stringify(response), {
		status: 400,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a not found error response.
 *
 * @param resource - Name of the resource that was not found
 * @param identifier - Optional identifier of the resource
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 404 status
 *
 * @example
 * ```typescript
 * const chat = await getChat(id);
 * if (!chat) {
 *   return notFound('Chat', id);
 * }
 * ```
 */
export function notFound(
	resource: string,
	identifier?: string,
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const message = identifier
		? `${resource} not found: ${identifier}`
		: `${resource} not found`

	const apiError: ApiError = {
		code: "NOT_FOUND",
		message,
		details: { resource, identifier },
		statusCode: 404,
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	return new Response(JSON.stringify(response), {
		status: 404,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates an unauthorized error response.
 *
 * @param message - Error message (defaults to "Authentication required")
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 401 status
 *
 * @example
 * ```typescript
 * const session = await getSession();
 * if (!session) {
 *   return unauthorized('Please sign in to continue');
 * }
 * ```
 */
export function unauthorized(
	message = "Authentication required",
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const apiError: ApiError = {
		code: "UNAUTHORIZED",
		message,
		statusCode: 401,
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	return new Response(JSON.stringify(response), {
		status: 401,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a forbidden error response.
 *
 * @param message - Error message (defaults to "Access denied")
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 403 status
 *
 * @example
 * ```typescript
 * if (!canAccessChat(userId, chatId)) {
 *   return forbidden('You do not have access to this chat');
 * }
 * ```
 */
export function forbidden(
	message = "Access denied",
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const apiError: ApiError = {
		code: "FORBIDDEN",
		message,
		statusCode: 403,
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	return new Response(JSON.stringify(response), {
		status: 403,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a rate limit exceeded error response.
 *
 * @param retryAfter - Seconds until rate limit resets
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with 429 status
 *
 * @example
 * ```typescript
 * if (rateLimitExceeded) {
 *   return rateLimit(60); // Retry after 60 seconds
 * }
 * ```
 */
export function rateLimit(
	retryAfter?: number,
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const apiError: ApiError = {
		code: "RATE_LIMIT_EXCEEDED",
		message: "Too many requests. Please try again later.",
		statusCode: 429,
	}

	if (retryAfter) {
		apiError.details = { retryAfter }
	}

	const response: ApiResponse<never> = {
		success: false,
		error: apiError,
	}

	const headers = createHeaders(options?.requestId)
	if (retryAfter) {
		headers.set("Retry-After", String(retryAfter))
	}

	return new Response(JSON.stringify(response), {
		status: 429,
		headers,
	})
}

// =============================================================================
// Paginated Response Builder
// =============================================================================

/**
 * Creates a paginated response with data and pagination metadata.
 *
 * @template T - The type of items in the data array
 * @param data - Array of items for the current page
 * @param pagination - Pagination metadata
 * @param options - Optional configuration (requestId)
 * @returns Next.js Response object with paginated data
 *
 * @example
 * ```typescript
 * const { items, total, page, pageSize } = await getChats(userId, page, 20);
 * return paginated(items, {
 *   page,
 *   pageSize,
 *   total,
 *   hasMore: page * pageSize < total,
 * });
 * ```
 */
export function paginated<T>(
	data: T[],
	pagination: PaginationMetadata,
	options?: {
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const response: PaginatedResponse<T> = {
		success: true,
		data,
		pagination,
	}

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: createHeaders(options?.requestId),
	})
}

// =============================================================================
// Streaming Response Builder
// =============================================================================

/**
 * Creates a streaming response for real-time data.
 * Useful for AI chat responses and other streaming content.
 *
 * @param stream - ReadableStream or stream creator function
 * @param options - Optional configuration (contentType, requestId)
 * @returns Next.js Response object with streaming body
 *
 * @example
 * ```typescript
 * // Using with AI SDK
 * const stream = await streamText({
 *   model: openai('gpt-4'),
 *   messages,
 * });
 *
 * return stream(() => stream.toDataStream());
 * ```
 */
export function stream(
	stream:
		| ReadableStream<Uint8Array>
		| (() =>
				| ReadableStream<Uint8Array>
				| Promise<ReadableStream<Uint8Array>>),
	options?: {
		/** Content-Type header (defaults to text/event-stream) */
		contentType?: string
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	const headers = new Headers()
	headers.set(
		"Content-Type",
		options?.contentType ?? "text/event-stream; charset=utf-8",
	)
	headers.set("Cache-Control", "no-cache")
	headers.set("Connection", "keep-alive")

	if (options?.requestId) {
		headers.set("X-Request-ID", options.requestId)
	}

	// Handle stream creator function
	if (typeof stream === "function") {
		// Return a response that will create the stream when needed
		return new Response(
			new ReadableStream({
				async start(controller) {
					try {
						const streamInstance = await stream()
						const reader = streamInstance.getReader()

						try {
							while (true) {
								const { done, value } = await reader.read()
								if (done) {
									controller.close()
									break
								}
								controller.enqueue(value)
							}
						} finally {
							reader.releaseLock()
						}
					} catch (error) {
						controller.error(error)
					}
				},
			}),
			{ headers },
		)
	}

	// Return response with direct stream
	return new Response(stream, { headers })
}

// =============================================================================
// Response Utilities
// =============================================================================

/**
 * Creates a JSON response with custom data and status.
 * Lower-level utility for custom response formats.
 *
 * @param data - Data to serialize as JSON
 * @param options - Optional configuration (status, requestId)
 * @returns Next.js Response object with JSON body
 *
 * @example
 * ```typescript
 * return json({ custom: 'response' }, { status: 201 });
 * ```
 */
export function json<T>(
	data: T,
	options?: {
		/** HTTP status code (defaults to 200) */
		status?: number
		/** Request ID for tracing */
		requestId?: string
	},
): Response {
	return new Response(JSON.stringify(data), {
		status: options?.status ?? 200,
		headers: createHeaders(options?.requestId),
	})
}

/**
 * Creates a redirect response.
 *
 * @param url - URL to redirect to
 * @param status - HTTP status code (defaults to 302)
 * @returns Next.js Response object with redirect
 *
 * @example
 * ```typescript
 * return redirect('/login');
 * ```
 */
export function redirect(url: string, status = 302): Response {
	return Response.redirect(new URL(url, "http://localhost"), status)
}

/**
 * Wraps an existing Response with request ID header.
 *
 * @param response - Original response to wrap
 * @param requestId - Request ID to add to headers
 * @returns New Response with X-Request-ID header
 */
export function withRequestId(response: Response, requestId: string): Response {
	const newHeaders = new Headers(response.headers)
	newHeaders.set("X-Request-ID", requestId)

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
}
