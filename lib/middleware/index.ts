/**
 * Middleware Module
 *
 * Barrel export for middleware utilities providing authentication,
 * rate limiting, deduplication, and composition utilities for API routes.
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
// Request Deduplication
// =============================================================================

export type {
	DeduplicatedRequestResult,
	DeduplicationConfig,
	DeduplicationPreset,
	DeduplicationResult,
} from "./deduplication"
export {
	DeduplicationPresets,
	deduplicateRequest,
	deduplicator,
	generateRequestFingerprint,
	withDeduplication,
} from "./deduplication"

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

// =============================================================================
// Request Utilities (re-exported for convenience)
// =============================================================================

export { getClientIP } from "@/lib/rate-limit"
