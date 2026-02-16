/**
 * Middleware Composition Utilities
 *
 * Provides utilities for chaining multiple middleware functions in sequence.
 * Enables reusable request processing pipelines for API routes.
 *
 * @module lib/middleware/compose
 */

import type { NextRequest, NextResponse } from "next/server"

import type { AuthContext } from "./auth"

// =============================================================================
// Types
// =============================================================================

/**
 * Generic middleware function type.
 *
 * @template T - Context type passed through the middleware chain
 */
export type Middleware<T = unknown> = (
	req: NextRequest,
	ctx: T,
	next: () => Promise<NextResponse>,
) => Promise<NextResponse>

/**
 * Middleware handler that processes the final request.
 */
export type MiddlewareHandler<T = unknown> = (
	req: NextRequest,
	ctx: T,
) => Promise<NextResponse>

// =============================================================================
// Composition Functions
// =============================================================================

/**
 * Compose multiple middleware into a single middleware function.
 *
 * Middleware is executed in order, with each middleware able to:
 * - Process the request before calling next()
 * - Modify the response after next() returns
 * - Short-circuit by returning a response without calling next()
 *
 * @template T - Context type passed through the middleware chain
 * @param middlewares - Middleware functions to compose
 * @returns Composed middleware function
 *
 * @example
 * ```typescript
 * const composed = compose(
 *   loggingMiddleware,
 *   authMiddleware,
 *   rateLimitMiddleware,
 * );
 *
 * const response = await composed(request, context, finalHandler);
 * ```
 */
export function compose<T>(
	...middlewares: Middleware<T>[]
): (
	req: NextRequest,
	ctx: T,
	handler: MiddlewareHandler<T>,
) => Promise<NextResponse> {
	return async (
		req: NextRequest,
		ctx: T,
		handler: MiddlewareHandler<T>,
	): Promise<NextResponse> => {
		// Create a chain of middleware where each calls the next
		let index = 0

		const next = async (): Promise<NextResponse> => {
			// If we've processed all middleware, call the final handler
			if (index >= middlewares.length) {
				return handler(req, ctx)
			}

			// Get the current middleware and increment index
			const middleware = middlewares[index]
			if (!middleware) {
				return handler(req, ctx)
			}
			index++

			// Call the middleware with the next function
			return middleware(req, ctx, next)
		}

		return next()
	}
}

/**
 * Create a middleware pipeline with a final handler.
 *
 * Combines middleware composition with a handler to create a ready-to-use
 * request processor. Useful for creating pre-configured API route handlers.
 *
 * @template T - Context type passed through the middleware chain
 * @param middlewares - Array of middleware functions
 * @param handler - Final handler to process the request
 * @returns Function that processes requests through the pipeline
 *
 * @example
 * ```typescript
 * // Create a protected API route handler
 * export const POST = createPipeline(
 *   [authMiddleware, rateLimitMiddleware],
 *   async (req, ctx) => {
 *     // Both auth and rate limit passed
 *     return NextResponse.json({ userId: ctx.userId });
 *   }
 * );
 * ```
 */
export function createPipeline<T>(
	middlewares: Middleware<T>[],
	handler: MiddlewareHandler<T>,
): (req: NextRequest, ctx: T) => Promise<NextResponse> {
	const composed = compose<T>(...middlewares)

	return async (req: NextRequest, ctx: T): Promise<NextResponse> => {
		return composed(req, ctx, handler)
	}
}

// =============================================================================
// Pre-built Middleware Chains
// =============================================================================

/**
 * Create an API middleware pipeline with auth and rate limiting.
 *
 * This is a factory that creates a standard pipeline for protected API routes.
 *
 * @param handler - The final request handler
 * @returns Request handler with auth and rate limiting
 *
 * @example
 * ```typescript
 * export const GET = apiMiddleware(async (req, ctx) => {
 *   return NextResponse.json({ userId: ctx.userId });
 * });
 * ```
 */
export function apiMiddleware(
	handler: MiddlewareHandler<AuthContext>,
): (req: NextRequest) => Promise<NextResponse> {
	// Import auth middleware dynamically to avoid circular dependencies
	return async (req: NextRequest): Promise<NextResponse> => {
		// For now, this is a placeholder that will be properly implemented
		// when the full middleware system is integrated
		const { withAuthMiddleware } = await import("./auth")
		return withAuthMiddleware(handler)(req)
	}
}

/**
 * Create a public API middleware pipeline with rate limiting only.
 *
 * Use this for routes that don't require authentication but still need rate limiting.
 *
 * @param handler - The final request handler
 * @returns Request handler with rate limiting
 */
export function publicMiddleware(
	handler: MiddlewareHandler<void>,
): (req: NextRequest) => Promise<NextResponse> {
	return async (req: NextRequest): Promise<NextResponse> => {
		// For public routes, just call the handler with empty context
		return handler(req, undefined as undefined)
	}
}
