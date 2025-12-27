/**
 * Library Root - Public API
 *
 * Main entry point for the lib module. Re-exports commonly used utilities
 * from submodules for convenient access.
 *
 * For specific functionality, import directly from submodules:
 * - `@/lib/ai` - AI providers and models
 * - `@/lib/api` - API utilities and fetch client
 * - `@/lib/auth` - Authentication and session management
 * - `@/lib/cache` - Redis cache operations
 * - `@/lib/cache-ops` - High-level cache operations
 * - `@/lib/config` - Application configuration
 * - `@/lib/data` - Data layer operations
 * - `@/lib/db` - Database client and schema
 * - `@/lib/errors` - Error handling utilities
 * - `@/lib/middleware` - Rate limiting and deduplication
 * - `@/lib/services` - Business logic services
 * - `@/lib/types` - Shared type definitions
 * - `@/lib/utils` - Common utility functions
 *
 * @module lib
 */

// =============================================================================
// UTILITIES (Most commonly used)
// =============================================================================

export { cn } from "./utils/cn";
export { debounce, debounceLeading } from "./utils/debounce";

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
    getAppConfig,
    getEnvironment,
    isDevelopment,
    isFeatureEnabled,
    isProduction,
    isTest,
} from "./config";

// =============================================================================
// ERROR HANDLING
// =============================================================================

export { AppError } from "./errors/app-error";
export {
    authError,
    forbiddenError,
    notFoundError,
    rateLimitError,
    validationError,
} from "./errors/factories";
export { ensureAppError, isAppError } from "./errors/utils";

// =============================================================================
// TYPES (Re-export key types)
// =============================================================================

export type {
    DataContext,
    OperationResult,
    PaginatedResult,
} from "./data";
export type {
    ActionResult,
    ErrorCategory,
    ErrorCode,
    ErrorSeverity,
} from "./errors";
export type {
    ApiChat,
    ApiDocument,
    ApiErrorResponse,
    ApiMessage,
    ApiVote,
} from "./types";

// =============================================================================
// Re-export submodules for namespace imports
// =============================================================================

export * as ai from "./ai";
export * as api from "./api";
export * as auth from "./auth";
export * as cache from "./cache";
export * as cacheOps from "./cache-ops";
export * as config from "./config";
export * as data from "./data";
export * as db from "./db";
export * as errors from "./errors";
export * as middleware from "./middleware";
export * as services from "./services";
export * as types from "./types";
export * as utils from "./utils";
