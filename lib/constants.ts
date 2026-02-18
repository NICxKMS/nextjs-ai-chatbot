/**
 * Application-wide constants for cache TTLs, rate limits, pagination, and feature flags.
 * All objects use `as const` for immutability and proper TypeScript inference.
 * @module lib/constants
 */

// ============================================================================
// Environment Detection
// ============================================================================

/** Whether the app is running in production environment */
export const isProductionEnvironment = process.env.NODE_ENV === "production"

/** Whether the app is running in development environment */
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development"

/** Whether the app is running in test environment (Playwright/CI) */
export const isTestEnvironment = Boolean(
	process.env.PLAYWRIGHT_TEST_BASE_URL ||
		process.env.PLAYWRIGHT ||
		process.env.CI_PLAYWRIGHT,
)

// ============================================================================
// Cache TTL Constants (Time-To-Live in seconds)
// ============================================================================

/**
 * Cache time-to-live values for different entity types.
 * Values are in seconds.
 */
export const CACHE_TTL = {
	/** Chat data cache - 1 hour */
	chat: 3600,
	/** Message cache - 30 minutes */
	message: 1800,
	/** User session cache - 2 hours */
	user: 7200,
	/** Artifact cache - 1 hour */
	artifact: 3600,
	/** List/pagination cache - 5 minutes */
	list: 300,
	/** Suggestion cache - 10 minutes */
	suggestion: 600,
	/** Guest session cache - 7 days */
	guest: 7 * 24 * 60 * 60,
	/** Default cache TTL - 24 hours */
	default: 24 * 60 * 60,
} as const

/** Type for CACHE_TTL object */
export type CacheTTL = typeof CACHE_TTL

/** Cache TTL keys for type-safe access */
export type CacheTTLKey = keyof CacheTTL

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Rate limiting configuration for different endpoint types.
 * Each limit defines `requests` per `window` (in seconds).
 */
export const RATE_LIMITS = {
	/** Chat endpoints - 60 requests per minute */
	chat: {
		requests: 60,
		window: 60,
	},
	/** Authentication endpoints - 10 requests per minute */
	auth: {
		requests: 10,
		window: 60,
	},
	/** Guest session creation - 5 requests per minute (stricter to prevent abuse) */
	guest: {
		requests: 5,
		window: 60,
	},
	/** File upload endpoints - 10 requests per hour (strict to prevent abuse) */
	upload: {
		requests: 10,
		window: 3600, // 1 hour
	},
	/** General API endpoints - 100 requests per minute */
	api: {
		requests: 100,
		window: 60,
	},
	/** Destructive operations (delete) - 10 requests per minute */
	strict: {
		requests: 10,
		window: 60,
	},
	/** Standard rate limit - for general API endpoints (100 requests per minute) */
	standard: {
		requests: 100,
		window: 60,
	},
	/** Generous rate limit - for high-volume endpoints like search, autocomplete (1000 requests per minute) */
	generous: {
		requests: 1000,
		window: 60,
	},
	/** Guest auth rate limit - for guest session creation with moderate limits (20 requests per minute) */
	authGuest: {
		requests: 20,
		window: 60,
	},
} as const

/** Type for a single rate limit configuration */
export type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]

/** Type for RATE_LIMITS object */
export type RateLimits = typeof RATE_LIMITS

/** Rate limit keys for type-safe access */
export type RateLimitKey = keyof RateLimits

// ============================================================================
// Pagination Defaults
// ============================================================================

/**
 * Default pagination values for list endpoints.
 */
export const PAGINATION = {
	/** Default number of items per page */
	defaultPageSize: 20,
	/** Maximum allowed items per page */
	maxPageSize: 100,
} as const

/** Type for PAGINATION object */
export type Pagination = typeof PAGINATION

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature toggles for enabling/disabling application features.
 * These can be used for gradual rollouts or A/B testing.
 */
export const FEATURE_FLAGS = {
	/** Enable artifact creation and viewing */
	enableArtifacts: true,
	/** Enable streaming responses */
	enableStreaming: true,
	/** Enable AI suggestions for artifacts */
	enableSuggestions: true,
	/** Enable rate limiting on API endpoints */
	enableRateLimiting: true,
} as const

/** Type for FEATURE_FLAGS object */
export type FeatureFlags = typeof FEATURE_FLAGS

/** Feature flag keys for type-safe access */
export type FeatureFlagKey = keyof FeatureFlags

// ============================================================================
// API Duration Constants (Vercel Fluid Compute optimization)
// ============================================================================

/**
 * API max duration constants for different endpoint types.
 * Used for Vercel Fluid Compute optimization.
 */
export const API_MAX_DURATION = {
	/** Short duration for fast APIs (history, vote, suggestions) */
	short: 10,
	/** Medium duration for upload APIs */
	medium: 30,
	/** Long duration for streaming APIs (chat) */
	long: 60,
} as const

/** Type for API_MAX_DURATION object */
export type ApiMaxDuration = typeof API_MAX_DURATION

// ============================================================================
// Message Constants
// ============================================================================

/**
 * Message-related constants.
 */
export const MESSAGE_CONSTANTS = {
	/** Maximum messages to load per chat */
	maxMessagesLimit: 1000,
	/** Role ordering for consistent message sorting (system < user < assistant) */
	roleOrder: {
		system: 0,
		user: 1,
		assistant: 2,
	} as const,
} as const

/** Type for MESSAGE_CONSTANTS object */
export type MessageConstants = typeof MESSAGE_CONSTANTS

/** Valid message role keys */
export type MessageRole = keyof (typeof MESSAGE_CONSTANTS)["roleOrder"]

// ============================================================================
// Validation Patterns
// ============================================================================

/**
 * UUID validation regex (RFC 4122).
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Guest ID regex pattern.
 * Matches guest IDs in format "guest:{uuid}" as created by session.ts
 */
export const GUEST_REGEX =
	/^guest:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============================================================================
// Guest Token Security Constants
// ============================================================================

/**
 * Guest Token Security Constants.
 *
 * Shorter JWT TTL with cookie-based rotation:
 * - JWT expires after 1 hour (enforced by jose verification)
 * - Cookie lasts 7 days (sliding window)
 * - When JWT expires, middleware creates new token with same guest ID
 * - This limits exposure if a token is leaked while maintaining UX
 */
export const GUEST_TOKEN_TTL = {
	/** JWT expiration time in seconds - 1 hour */
	jwtExpiration: 60 * 60,
	/** Rotation threshold in seconds - rotate when < 30 mins left */
	rotationThreshold: 30 * 60,
} as const

/** Type for GUEST_TOKEN_TTL object */
export type GuestTokenTTL = typeof GUEST_TOKEN_TTL

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate if a string is a valid UUID.
 * @param value - String to validate
 * @returns true if valid UUID format
 * @example
 * ```typescript
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * isValidUUID("invalid") // false
 * ```
 */
export function isValidUUID(value: string): boolean {
	return UUID_REGEX.test(value)
}

/**
 * Validate if a string is a valid guest ID.
 * @param value - String to validate
 * @returns true if valid guest ID format
 * @example
 * ```typescript
 * isValidGuestId("guest:550e8400-e29b-41d4-a716-446655440000") // true
 * isValidGuestId("550e8400-e29b-41d4-a716-446655440000") // false
 * ```
 */
export function isValidGuestId(value: string): boolean {
	return GUEST_REGEX.test(value)
}

/**
 * Default secure cookie configuration options.
 * Use this for consistent cookie settings across all auth-related cookies.
 *
 * @param maxAge - Optional max age in seconds (defaults to CACHE_TTL.guest)
 * @returns Cookie options object
 *
 * @example
 * ```typescript
 * cookieStore.set("my_cookie", value, getSecureCookieOptions());
 * cookieStore.set("session", token, getSecureCookieOptions(3600));
 * ```
 */
export function getSecureCookieOptions(maxAge?: number) {
	return {
		httpOnly: true,
		secure: isProductionEnvironment,
		path: "/",
		sameSite: "lax" as const,
		maxAge: maxAge ?? CACHE_TTL.guest,
	}
}

/**
 * Sort messages by timestamp with role-based tiebreaker.
 * Ensures consistent ordering when messages have the same timestamp.
 *
 * @param messages - Array of messages with createdAt and role properties
 * @returns Sorted array of messages
 * @example
 * ```typescript
 * const sorted = sortMessagesByTimeAndRole(messages);
 * ```
 */
export function sortMessagesByTimeAndRole<
	T extends { createdAt: Date | string; role: string },
>(messages: T[]): T[] {
	return [...messages].sort((a, b) => {
		const timeA =
			a.createdAt instanceof Date
				? a.createdAt.getTime()
				: new Date(a.createdAt).getTime()
		const timeB =
			b.createdAt instanceof Date
				? b.createdAt.getTime()
				: new Date(b.createdAt).getTime()
		if (timeA !== timeB) {
			return timeA - timeB
		}
		// Role tiebreaker: system < user < assistant
		const roleA = a.role as MessageRole
		const roleB = b.role as MessageRole
		return (
			(MESSAGE_CONSTANTS.roleOrder[roleA] ?? 1) -
			(MESSAGE_CONSTANTS.roleOrder[roleB] ?? 1)
		)
	})
}

/**
 * Calculate ZSET score with role-based microsecond offset.
 * Used for atomic Redis operations to ensure correct message ordering.
 *
 * @param createdAt - Message creation timestamp
 * @param role - Message role (system, user, assistant)
 * @returns Numeric score for Redis ZSET
 */
export function getZScoreWithRoleOffset(createdAt: Date, role: string): number {
	const baseScore = createdAt.getTime()
	// Add microsecond offset based on role for deterministic ordering
	// system=0, user=100, assistant=200 microseconds
	const roleKey = role as MessageRole
	const roleOffset = (MESSAGE_CONSTANTS.roleOrder[roleKey] ?? 1) * 100
	return baseScore + roleOffset / 1_000_000
}
