/**
 * Middleware Module
 *
 * Barrel export for middleware utilities providing authentication,
 * rate limiting, and composition utilities for API routes.
 *
 * @module lib/middleware
 */

// =============================================================================
// Auth Middleware
// =============================================================================

export type { AuthContext, MiddlewareHandler } from "./auth"
export {
	getAuthContext,
	withAuthMiddleware,
	withOptionalAuthMiddleware,
} from "./auth"

// =============================================================================
// Rate Limit Middleware
// =============================================================================

export type { RateLimitMiddlewareResult } from "./rate-limit"
export {
	chatRateLimit,
	getRateLimitHeaders,
	withRateLimitMiddleware,
} from "./rate-limit"

// =============================================================================
// Composition Utilities
// =============================================================================

export type {
	Middleware,
	MiddlewareHandler as ComposableHandler,
} from "./compose"
export {
	apiMiddleware,
	compose,
	createPipeline,
	publicMiddleware,
} from "./compose"
