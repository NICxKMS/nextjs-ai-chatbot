/**
 * API Context Utilities
 *
 * Request-scoped context with AsyncLocalStorage for cross-async propagation.
 * Provides request ID generation, user context, and timing utilities.
 *
 * @module lib/api/context
 */

import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"

// =============================================================================
// Types
// =============================================================================

/**
 * Request-scoped context for API routes.
 * Provides tracing, auth state, and request metadata.
 */
export interface RequestContext {
	/** Unique request ID for tracing */
	requestId: string
	/** Authenticated user ID (if authenticated) */
	userId?: string
	/** Whether the request is from a guest user */
	isGuest?: boolean
	/** Request start timestamp (milliseconds) */
	startTime: number
	/** Request HTTP method */
	method?: string
	/** Request path */
	path?: string
	/** Client IP address */
	clientIp?: string
	/** User agent string */
	userAgent?: string
}

/**
 * Options for creating a request context.
 */
export interface ContextOptions {
	/** Require authentication (throws if not authenticated) */
	requireAuth?: boolean
	/** Existing request ID from headers */
	requestId?: string
	/** Pre-authenticated user ID */
	userId?: string
	/** Guest user flag */
	isGuest?: boolean
}

/**
 * API context for use in route handlers.
 * Extends RequestContext with helper methods.
 */
export interface ApiContext extends RequestContext {
	/** Get elapsed time since request start */
	getDuration: () => number
	/** Check if user is authenticated */
	isAuthenticated: () => boolean
	/** Check if user is a guest */
	isGuestUser: () => boolean
}

// =============================================================================
// AsyncLocalStorage Setup
// =============================================================================

/**
 * AsyncLocalStorage instance for request-scoped context.
 * Enables context propagation across async boundaries.
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>()

// =============================================================================
// Request ID Generation
// =============================================================================

/**
 * Generates a unique request ID using UUID v4.
 *
 * @returns A unique request ID string
 */
export function generateRequestId(): string {
	return randomUUID()
}

/**
 * Extracts or generates a request ID from headers.
 * Checks X-Request-ID header first, then generates a new one.
 *
 * @param headers - Headers object to extract from
 * @returns Request ID string
 */
export function getOrCreateRequestId(headers: Headers): string {
	const existingId = headers.get("x-request-id")
	if (existingId && isValidRequestId(existingId)) {
		return existingId
	}
	return generateRequestId()
}

/**
 * Validates a request ID format.
 * Accepts UUIDs and custom formats (alphanumeric with hyphens).
 *
 * @param id - Request ID to validate
 * @returns True if the ID is valid
 */
function isValidRequestId(id: string): boolean {
	// Accept UUIDs or custom alphanumeric IDs (8-64 chars)
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	const customIdRegex = /^[a-zA-Z0-9-]{8,64}$/
	return uuidRegex.test(id) || customIdRegex.test(id)
}

// =============================================================================
// Context Accessors
// =============================================================================

/**
 * Gets the current request context.
 * Returns undefined if called outside a request scope.
 *
 * @returns Current RequestContext or undefined
 *
 * @example
 * ```typescript
 * const ctx = getRequestContext();
 * if (ctx) {
 *   console.log(`Request ${ctx.requestId} by user ${ctx.userId}`);
 * }
 * ```
 */
export function getRequestContext(): RequestContext | undefined {
	return requestContextStorage.getStore()
}

/**
 * Gets the current request ID.
 * Returns undefined if called outside a request scope.
 *
 * @returns Current request ID or undefined
 */
export function getRequestId(): string | undefined {
	return requestContextStorage.getStore()?.requestId
}

/**
 * Gets the current user ID from context.
 * Returns undefined if not authenticated or outside request scope.
 *
 * @returns Current user ID or undefined
 */
export function getCurrentUserId(): string | undefined {
	return requestContextStorage.getStore()?.userId
}

/**
 * Gets elapsed time since request start.
 * Returns undefined if called outside a request scope.
 *
 * @returns Elapsed time in milliseconds or undefined
 */
export function getRequestDuration(): number | undefined {
	const ctx = requestContextStorage.getStore()
	if (!ctx) return undefined
	return Date.now() - ctx.startTime
}

// =============================================================================
// Context Execution
// =============================================================================

/**
 * Runs a function within a request context.
 * Creates a new context with a unique request ID.
 *
 * @template T - Return type of the function
 * @param fn - Function to run within context
 * @param initialContext - Optional initial context values
 * @returns Return value of the function
 *
 * @example
 * ```typescript
 * const result = runWithRequestContext(
 *   () => someAsyncOperation(),
 *   { userId: 'user-123' }
 * );
 * ```
 */
export function runWithRequestContext<T>(
	fn: () => T,
	initialContext?: Partial<RequestContext>,
): T {
	const context: RequestContext = {
		requestId: initialContext?.requestId ?? generateRequestId(),
		startTime: initialContext?.startTime ?? Date.now(),
	}

	// Only add optional properties if they have values
	if (initialContext?.userId !== undefined) {
		context.userId = initialContext.userId
	}
	if (initialContext?.isGuest !== undefined) {
		context.isGuest = initialContext.isGuest
	}
	if (initialContext?.method !== undefined) {
		context.method = initialContext.method
	}
	if (initialContext?.path !== undefined) {
		context.path = initialContext.path
	}
	if (initialContext?.clientIp !== undefined) {
		context.clientIp = initialContext.clientIp
	}
	if (initialContext?.userAgent !== undefined) {
		context.userAgent = initialContext.userAgent
	}

	return requestContextStorage.run(context, fn)
}

/**
 * Runs an async function within a request context.
 * Creates a new context with a unique request ID.
 *
 * @template T - Return type of the function
 * @param fn - Async function to run within context
 * @param initialContext - Optional initial context values
 * @returns Promise resolving to return value of the function
 */
export async function runWithRequestContextAsync<T>(
	fn: () => Promise<T>,
	initialContext?: Partial<RequestContext>,
): Promise<T> {
	const context: RequestContext = {
		requestId: initialContext?.requestId ?? generateRequestId(),
		startTime: initialContext?.startTime ?? Date.now(),
	}

	// Only add optional properties if they have values
	if (initialContext?.userId !== undefined) {
		context.userId = initialContext.userId
	}
	if (initialContext?.isGuest !== undefined) {
		context.isGuest = initialContext.isGuest
	}
	if (initialContext?.method !== undefined) {
		context.method = initialContext.method
	}
	if (initialContext?.path !== undefined) {
		context.path = initialContext.path
	}
	if (initialContext?.clientIp !== undefined) {
		context.clientIp = initialContext.clientIp
	}
	if (initialContext?.userAgent !== undefined) {
		context.userAgent = initialContext.userAgent
	}

	return requestContextStorage.run(context, fn)
}

// =============================================================================
// Context Updates
// =============================================================================

/**
 * Updates the current request context.
 * Useful for adding user ID after authentication.
 *
 * @param updates - Partial context to merge
 *
 * @example
 * ```typescript
 * // After authentication
 * setRequestUserId('user-123');
 * ```
 */
export function updateRequestContext(
	updates: Partial<Omit<RequestContext, "requestId" | "startTime">>,
): void {
	const current = requestContextStorage.getStore()
	if (!current) {
		console.warn("updateRequestContext called outside of request scope")
		return
	}

	// Apply updates
	if (updates.userId !== undefined) {
		current.userId = updates.userId
	}
	if (updates.isGuest !== undefined) {
		current.isGuest = updates.isGuest
	}
	if (updates.method !== undefined) {
		current.method = updates.method
	}
	if (updates.path !== undefined) {
		current.path = updates.path
	}
	if (updates.clientIp !== undefined) {
		current.clientIp = updates.clientIp
	}
	if (updates.userAgent !== undefined) {
		current.userAgent = updates.userAgent
	}
}

/**
 * Sets the user ID in the current request context.
 * Convenience function for post-authentication updates.
 *
 * @param userId - User ID to set
 * @param isGuest - Whether this is a guest user
 */
export function setRequestUser(userId: string, isGuest = false): void {
	updateRequestContext({ userId, isGuest })
}

// =============================================================================
// Context Creation from Request
// =============================================================================

/**
 * Creates a request context from a Request object.
 * Extracts headers and metadata automatically.
 *
 * @param request - Request object to extract from
 * @param options - Context creation options
 * @returns RequestContext object
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const ctx = createRequestContext(request);
 *   return runWithRequestContext(() => handleRequest(request), ctx);
 * }
 * ```
 */
export function createRequestContext(
	request: Request,
	options?: ContextOptions,
): RequestContext {
	const url = new URL(request.url)
	const userAgent = request.headers.get("user-agent")

	const context: RequestContext = {
		requestId: options?.requestId ?? getOrCreateRequestId(request.headers),
		startTime: Date.now(),
		method: request.method,
		path: url.pathname,
		clientIp: getClientIp(request),
	}

	// Only add optional properties if they have values
	if (options?.userId !== undefined) {
		context.userId = options.userId
	}
	if (options?.isGuest !== undefined) {
		context.isGuest = options.isGuest
	}
	if (userAgent !== null) {
		context.userAgent = userAgent
	}

	return context
}

/**
 * Creates an ApiContext with helper methods.
 *
 * @param request - Request object to extract from
 * @param options - Context creation options
 * @returns ApiContext object with helper methods
 */
export function getApiContext(
	request: Request,
	options?: ContextOptions,
): ApiContext {
	const baseContext = createRequestContext(request, options)

	return {
		...baseContext,
		getDuration: () => Date.now() - baseContext.startTime,
		isAuthenticated: () => !!baseContext.userId && !baseContext.isGuest,
		isGuestUser: () => !!baseContext.isGuest,
	}
}

// =============================================================================
// Request Utilities
// =============================================================================

/**
 * Extracts client IP address from request headers.
 * Handles x-forwarded-for, x-real-ip, and fallbacks.
 *
 * @param request - Request object to extract from
 * @returns Client IP address or "unknown"
 */
export function getClientIp(request: Request): string {
	// x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
	// The first IP is the original client
	const forwardedFor = request.headers.get("x-forwarded-for")
	if (forwardedFor) {
		const firstIp = forwardedFor.split(",")[0]?.trim()
		if (firstIp) {
			return firstIp
		}
	}

	// Fallback to x-real-ip (set by some proxies like nginx)
	const realIp = request.headers.get("x-real-ip")
	if (realIp) {
		return realIp
	}

	// Vercel-specific header
	const vercelIp = request.headers.get("x-vercel-forwarded-for")
	if (vercelIp) {
		const firstIp = vercelIp.split(",")[0]?.trim()
		if (firstIp) {
			return firstIp
		}
	}

	return "unknown"
}

/**
 * Extracts search params from a request.
 *
 * @param request - Request object
 * @returns URLSearchParams object
 */
export function getSearchParams(request: Request): URLSearchParams {
	const url = new URL(request.url)
	return url.searchParams
}

/**
 * Validates Origin/Referer headers for CSRF protection.
 * Should be used for state-changing endpoints (POST/PUT/DELETE).
 *
 * @param request - Request object to validate
 * @returns True if origin is valid
 */
export function validateOrigin(request: Request): boolean {
	const origin = request.headers.get("origin")
	const referer = request.headers.get("referer")
	const requestUrl = new URL(request.url)

	// Build list of allowed origins
	const allowedOrigins = new Set<string>()

	// Always allow the request's own origin
	allowedOrigins.add(requestUrl.origin)

	// Allow configured Vercel URL
	if (process.env.VERCEL_URL) {
		allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
	}

	// Allow configured app URL
	if (process.env.NEXT_PUBLIC_APP_URL) {
		allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL)
	}

	// Development: allow localhost variations
	if (process.env.NODE_ENV === "development") {
		allowedOrigins.add("http://localhost:3000")
		allowedOrigins.add("http://127.0.0.1:3000")
	}

	// Check Origin header (preferred for CSRF protection)
	if (origin) {
		return allowedOrigins.has(origin)
	}

	// Fallback to Referer header
	if (referer) {
		try {
			const refererUrl = new URL(referer)
			return allowedOrigins.has(refererUrl.origin)
		} catch {
			return false
		}
	}

	// No Origin or Referer header - reject for mutation requests
	return false
}

// =============================================================================
// Context Formatting
// =============================================================================

/**
 * Formats request context for logging.
 *
 * @param ctx - RequestContext to format
 * @returns Formatted string for logging
 */
export function formatRequestContext(ctx?: RequestContext): string {
	if (!ctx) {
		return "[no-context]"
	}

	const parts = [`req=${ctx.requestId.slice(0, 8)}`]

	if (ctx.userId) {
		// Truncate user ID for privacy
		const truncatedUserId = ctx.userId.startsWith("guest:")
			? `guest:${ctx.userId.slice(6, 14)}...`
			: `${ctx.userId.slice(0, 8)}...`
		parts.push(`user=${truncatedUserId}`)
	}

	if (ctx.method && ctx.path) {
		parts.push(`${ctx.method} ${ctx.path}`)
	}

	const duration = Date.now() - ctx.startTime
	parts.push(`${duration}ms`)

	return `[${parts.join(" ")}]`
}

// =============================================================================
// Route Handler Wrapper
// =============================================================================

/**
 * Route handler type definition.
 */
type RouteHandler = (
	request: Request,
	context?: { params?: Record<string, string | string[]> },
) => Promise<Response> | Response

/**
 * Wraps an API route handler with request context.
 * Automatically generates request IDs and tracks timing.
 *
 * @param handler - Route handler to wrap
 * @returns Wrapped handler with context
 *
 * @example
 * ```typescript
 * export const POST = withRequestContext(async (request) => {
 *   const ctx = getRequestContext();
 *   console.log(`Handling request ${ctx?.requestId}`);
 *   return success({ ok: true });
 * });
 * ```
 */
export function withRequestContext(handler: RouteHandler): RouteHandler {
	return (request, routeContext) => {
		const initialContext = createRequestContext(request)

		return runWithRequestContext(
			() => handler(request, routeContext),
			initialContext,
		) as Response | Promise<Response>
	}
}
