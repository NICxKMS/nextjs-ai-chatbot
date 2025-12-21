/**
 * Middleware Module Exports
 * Ref: lib/middleware/
 */

export {
    // Deduplication
    isDuplicateRequest,
    cacheDeduplicationResponse,
    withDeduplication,
    clearDeduplicationStore,
    getDeduplicationStoreSize,
    type DeduplicationOptions,
    type DeduplicationResult,
} from "./deduplication";

export {
    // Limiters
    standardLimiter,
    strictLimiter,
    authLimiter,
    chatLimiter,
    uploadLimiter,
    guestLimiter,
    searchLimiter,
    limiters,

    // Types
    type LimiterType,
    type RateLimitResult,
    type IdentifierExtractor,
    type MiddlewareConfig,

    // Core functions
    checkRateLimit,
    getRateLimitHeaders,
    rateLimitResponse,

    // Identifier extractors
    getIpIdentifier,
    getUserIdentifier,

    // HOF wrapper
    withRateLimit,

    // Middleware factory
    createRateLimitMiddleware,

    // Utilities
    isRateLimitingAvailable,
} from "./rate-limit";
