import "server-only";

import {
	createContextFromHeaders,
	runWithRequestContext,
	updateRequestContext,
} from "./request-context";

/**
 * API Route Handler Wrapper with Request Context
 *
 * Wraps API route handlers to automatically:
 * - Generate unique request IDs
 * - Extract request ID from headers (X-Request-ID)
 * - Correlate logs with requests
 * - Track request timing
 *
 * Usage in API routes:
 * ```ts
 * import { withRequestContext } from "@/lib/api-context";
 *
 * export const POST = withRequestContext(async (request) => {
 *   // Your handler code here - request context is automatically available
 *   return Response.json({ success: true });
 * });
 * ```
 */

type RouteHandler = (
	request: Request,
	context?: { params?: Record<string, string | string[]> }
) => Promise<Response> | Response;

type RouteHandlerWithContext = (
	request: Request,
	context?: { params?: Record<string, string | string[]> }
) => Promise<Response> | Response;

/**
 * Wrap an API route handler with request context
 */
export function withRequestContext(
	handler: RouteHandler
): RouteHandlerWithContext {
	return (request, routeContext) => {
		const url = new URL(request.url);
		const initialContext = createContextFromHeaders(
			request.headers,
			request.method,
			url.pathname
		);

		return runWithRequestContext(
			() => handler(request, routeContext),
			initialContext
		) as Promise<Response>;
	};
}

/**
 * Higher-order function to add user ID to request context after authentication
 */
export function setRequestUserId(userId: string): void {
	updateRequestContext({ userId });
}

/**
 * Create response with request ID header
 */
export function createResponseWithRequestId(
	body: BodyInit | null,
	init?: ResponseInit,
	requestId?: string
): Response {
	const headers = new Headers(init?.headers);
	if (requestId) {
		headers.set("X-Request-ID", requestId);
	}

	return new Response(body, {
		...init,
		headers,
	});
}

/**
 * Create JSON response with request ID header
 */
export function jsonResponseWithRequestId<T>(
	data: T,
	init?: ResponseInit,
	requestId?: string
): Response {
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "application/json");
	if (requestId) {
		headers.set("X-Request-ID", requestId);
	}

	return new Response(JSON.stringify(data), {
		...init,
		headers,
	});
}

/**
 * Extract request context info for response headers
 */
export type ResponseContext = {
	requestId: string;
	duration?: number;
};

/**
 * Add request context to an existing Response
 */
export function addRequestContextToResponse(
	response: Response,
	context: ResponseContext
): Response {
	const newHeaders = new Headers(response.headers);
	newHeaders.set("X-Request-ID", context.requestId);
	if (context.duration !== undefined) {
		newHeaders.set("X-Response-Time", `${context.duration}ms`);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}
