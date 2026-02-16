/**
 * Authentication Middleware
 *
 * Provides authentication middleware for API routes—validates sessions,
 * extracts user info, and handles unauthorized requests.
 *
 * @module lib/middleware/auth
 */

import { type NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"

// =============================================================================
// Types
// =============================================================================

/**
 * Authentication context provided to handlers after successful auth.
 */
export interface AuthContext {
	/** User ID (UUID for regular users, guest:UUID for guests) */
	userId: string
	/** Email address (only for authenticated users) */
	email?: string | null
	/** Whether the user is a guest */
	isGuest: boolean
}

/**
 * Middleware handler function type.
 */
export type MiddlewareHandler<T = AuthContext> = (
	req: NextRequest,
	ctx: T,
) => Promise<NextResponse> | NextResponse

// =============================================================================
// Auth Middleware Functions
// =============================================================================

/**
 * Authentication middleware that requires a valid session.
 *
 * Wraps an API route handler and ensures the user is authenticated
 * before allowing access. Returns 401 Unauthorized if no session exists.
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler that requires authentication
 *
 * @example
 * ```typescript
 * // In an API route
 * export const GET = withAuthMiddleware(async (req, ctx) => {
 *   // ctx.userId is guaranteed to exist
 *   return NextResponse.json({ userId: ctx.userId });
 * });
 * ```
 */
export function withAuthMiddleware(
	handler: MiddlewareHandler,
): (req: NextRequest) => Promise<NextResponse> {
	return async (req: NextRequest): Promise<NextResponse> => {
		const ctx = await getAuthContext(req)

		if (!ctx) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 },
			)
		}

		return handler(req, ctx)
	}
}

/**
 * Optional authentication middleware.
 *
 * Wraps an API route handler and provides auth context if available,
 * but allows the request to proceed even without authentication.
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler with optional auth context
 *
 * @example
 * ```typescript
 * export const GET = withOptionalAuthMiddleware(async (req, ctx) => {
 *   if (ctx) {
 *     // User is authenticated
 *     return NextResponse.json({ userId: ctx.userId });
 *   }
 *   // Anonymous access
 *   return NextResponse.json({ anonymous: true });
 * });
 * ```
 */
export function withOptionalAuthMiddleware(
	handler: (
		req: NextRequest,
		ctx: AuthContext | null,
	) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
	return async (req: NextRequest): Promise<NextResponse> => {
		const ctx = await getAuthContext(req)
		return handler(req, ctx)
	}
}

// =============================================================================
// Auth Context Extraction
// =============================================================================

/**
 * Extract authentication context from a request.
 *
 * Checks for an authenticated session and returns user info if available.
 * Can be used directly in routes that need auth info without middleware wrapping.
 *
 * @param req - The incoming request
 * @returns Auth context if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * const ctx = await getAuthContext(request);
 * if (ctx) {
 *   console.log('User ID:', ctx.userId);
 *   console.log('Is guest:', ctx.isGuest);
 * }
 * ```
 */
export async function getAuthContext(
	_req: NextRequest,
): Promise<AuthContext | null> {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return null
		}

		// Check if this is a guest user
		const isGuest = session.user.id.startsWith("guest:")

		return {
			userId: session.user.id,
			email: session.user.email ?? null,
			isGuest,
		}
	} catch {
		// Auth check failed - treat as unauthenticated
		return null
	}
}
