/**
 * Lib - Root Barrel Export
 *
 * Re-exports all lib modules for convenient imports.
 * This file provides a single entry point for all library utilities.
 *
 * Architecture:
 * - lib/a11y/ - Accessibility utilities (focus management, keyboard navigation)
 * - lib/ai/ - AI utilities (providers, registry, token counting)
 * - lib/api/ - API utilities (context, response, validation)
 * - lib/auth/ - Authentication utilities (config, guards, session)
 * - lib/cache/ - Caching utilities (tiered cache, invalidation)
 * - lib/data/ - Data layer (repositories, services, queries)
 * - lib/db/ - Database utilities (Drizzle client, schema)
 * - lib/editor/ - Editor utilities (diff algorithm)
 * - lib/errors/ - Error handling (messages, classes)
 * - lib/middleware/ - Request middleware
 * - lib/rate-limit/ - Rate limiting utilities
 * - lib/types/ - TypeScript type definitions
 * - lib/utils/ - General utilities (cn, format, date, string, validation)
 *
 * NOTE ON CONFLICTS:
 * Some exports are duplicated across modules (isValidEmail, isValidUrl, isValidUUID, RateLimitConfig).
 * Due to TypeScript limitations with barrel exports, we cannot use wildcard exports for all modules.
 * For conflicting exports, import directly from the specific module:
 * - isValidEmail, isValidUrl, isValidUUID: import from '@/lib/api' or '@/lib/utils'
 * - RateLimitConfig: import from '@/lib/rate-limit' or '@/lib/constants'
 *
 * @module lib
 */

// =============================================================================
// Accessibility Utilities
// =============================================================================

export * from "./a11y"

// =============================================================================
// AI Utilities
// =============================================================================

export * from "./ai"

// =============================================================================
// API Utilities
// =============================================================================

export * from "./api"

// =============================================================================
// Auth Utilities
// =============================================================================

export * from "./auth"

// =============================================================================
// Cache Utilities
// =============================================================================

export * from "./cache"

// =============================================================================
// Data Layer (Repositories, Services, Queries)
// =============================================================================

export * from "./data"

// =============================================================================
// Database Utilities
// =============================================================================

export {
	type BatchDeleteOptions,
	type BatchInsertOptions,
	type BatchResult,
	type BatchUpdateOptions,
	type BatchUpsertOptions,
	batchDelete as dbBatchDelete,
	batchInsert as dbBatchInsert,
	batchUpdate as dbBatchUpdate,
	batchUpsert,
	batchWithResult,
	buildCursorCondition,
	type CursorPaginatedResult as DBCursorPaginatedResult,
	closeConnection,
	createPaginationResponse,
	db,
	decodeCursor,
	encodeCursor,
	isHealthy,
	type PaginationDirection,
	paginate,
	paginateWithCount,
	toCursorOptions,
	toPaginatedResult,
	withSequentialTransactions as dbWithSequentialTransactions,
	withTransaction as dbWithTransaction,
} from "./db"

// =============================================================================
// Editor Utilities
// =============================================================================

// Note: lib/editor/ does not have an index.ts barrel export
// Import directly from lib/editor/diff if needed

// =============================================================================
// Error Handling
// =============================================================================

// Note: lib/errors/ directory does not exist
// Use lib/errors.ts for error classes and messages

// =============================================================================
// Middleware
// =============================================================================

export * from "./middleware"

// =============================================================================
// Rate Limiting
// =============================================================================

export * from "./rate-limit"

// =============================================================================
// Type Definitions
// =============================================================================

export * from "./types"

// =============================================================================
// Utility Functions
// =============================================================================

// Note: utils re-exports isValidEmail, isValidUrl, isValidUuid which conflict with api
// Import validation functions from '@/lib/api' for API validation use cases
export {
	// Date utilities
	addDays,
	// String utilities
	capitalize,
	// Classname utility
	cn,
	differenceInDays,
	endOfDay,
	// Formatting utilities
	formatDate,
	formatDuration,
	formatFileSize,
	formatNumber,
	formatRelativeTime,
	// Document utilities
	getDocumentTimestampByIndex,
	isToday,
	isYesterday,
	sanitizeHtml,
	slugify,
	startOfDay,
	truncate,
} from "./utils"

// =============================================================================
// Root-level exports (constants, errors, log, motion)
// =============================================================================

// Note: constants exports RateLimitConfig and isValidUUID which conflict with other modules
// Import those from '@/lib/rate-limit' and '@/lib/api' respectively
export {
	// API max duration
	API_MAX_DURATION,
	type ApiMaxDuration,
	// Cache TTL
	CACHE_TTL,
	type CacheTTL,
	type CacheTTLKey,
	// Feature flags
	FEATURE_FLAGS,
	type FeatureFlagKey,
	type FeatureFlags,
	GUEST_REGEX,
	// Guest token TTL
	GUEST_TOKEN_TTL,
	type GuestTokenTTL,
	getSecureCookieOptions,
	getZScoreWithRoleOffset,
	// Environment detection
	isDevelopmentEnvironment,
	isProductionEnvironment,
	isTestEnvironment,
	// Utility functions
	isValidGuestId,
	// Message constants
	MESSAGE_CONSTANTS,
	type MessageConstants,
	type MessageRole,
	// Pagination
	PAGINATION,
	type Pagination,
	// Rate limits (note: RateLimitConfig also in rate-limit module)
	RATE_LIMITS,
	type RateLimitKey,
	type RateLimits,
	sortMessagesByTimeAndRole,
	// Validation patterns
	UUID_REGEX,
} from "./constants"

// Error classes and utilities
export * from "./errors"

// Logging utility
export * from "./log"

// Motion/animation utilities
export * from "./motion"
