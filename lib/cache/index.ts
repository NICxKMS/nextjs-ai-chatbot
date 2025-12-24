/**
 * Cache Module - Public API
 * Ref: 04-cache-layer-optimal-design.md
 *
 * @module lib/cache
 */

// Circuit breaker
export {
    getCircuitState,
    isCircuitOpen,
    recordFailure,
    recordSuccess,
    withCircuitBreaker,
} from "./circuit-breaker";
// Client
export { getRedis, isRedisAvailable, safeRedis } from "./client";
// Constants
export {
    CIRCUIT_FAILURE_THRESHOLD,
    CIRCUIT_RESET_TIMEOUT_MS,
    GUEST_CACHE_TTL_SECONDS,
    QUOTA_TTL_SECONDS,
} from "./constants";
// Document preview cache
export {
    type CachedPreview,
    clearPreviewCache,
    getCachedPreview,
    getDocumentPreview,
    getPreviewCacheStats,
    invalidatePreview,
    invalidatePreviews,
    setDocumentPreview,
} from "./document-preview";
// Helpers
export {
    deserialize,
    fromUnixTimestamp,
    getMessageScore,
    getQuotaDateKey,
    isGuestUserId,
    parseMessageScore,
    serialize,
    toUnixTimestamp,
    toUnixTimestampMs,
    toUnixTimestampSeconds,
} from "./helpers";
// Invalidation
export {
    clearAllHandlers,
    createScopedInvalidator,
    getRegisteredHandlers,
    type InvalidationResult,
    type InvalidationScope,
    invalidateChats,
    invalidateDocuments,
    invalidateOnLogout,
    invalidateSession,
    invalidateSettings,
    registerInvalidationHandler,
    useInvalidationHandler,
} from "./invalidation";
// Keys
export { CacheKeys, getChatCacheKeys, parseKeyId } from "./keys";
// Tags (Next.js 16.1.0 cache invalidation)
export { CacheTags, type CacheTagValue } from "./tags";
// Types
export type {
    CachedChat,
    CachedChatMeta,
    CachedDocument,
    CachedDocumentVersion,
    CachedMessage,
    CachedUserChatItem,
    CacheOptions,
    CircuitBreakerState,
} from "./types";
// Invalidation hooks (client-side)
export { useInvalidation, useInvalidationActions } from "./use-invalidation";
