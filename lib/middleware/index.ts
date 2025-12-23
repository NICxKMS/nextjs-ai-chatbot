/**
 * Middleware Module Exports
 * Ref: lib/middleware/
 */

export {
    cacheDeduplicationResponse,
    clearDeduplicationStore,
    type DeduplicationOptions,
    type DeduplicationResult,
    getDeduplicationStoreSize,
    // Deduplication
    isDuplicateRequest,
    withDeduplication,
} from "./deduplication";

export {
    authLimiter,
    chatLimiter,
    // Core functions
    checkRateLimit,
    // Middleware factory
    createRateLimitMiddleware,
    // Identifier extractors
    getIpIdentifier,
    getRateLimitHeaders,
    getUserIdentifier,
    guestLimiter,
    type IdentifierExtractor,
    // Utilities
    isRateLimitingAvailable,
    // Types
    type LimiterType,
    limiters,
    type MiddlewareConfig,
    type RateLimitResult,
    rateLimitResponse,
    searchLimiter,
    // Limiters
    standardLimiter,
    strictLimiter,
    uploadLimiter,
    // HOF wrapper
    withRateLimit,
} from "./rate-limit";

export {
    // Constants
    CORRELATION_ID_HEADER,
    // Context creation
    createRequestContext,
    // ID generation
    generateRequestId,
    generateShortRequestId,
    // Request helpers
    getOrCreateRequestId,
    getRequestIdFromHeaders,
    REQUEST_ID_HEADER,
    // Types
    type RequestContext,
    // Response helpers
    setRequestIdHeaders,
} from "./request-id";
