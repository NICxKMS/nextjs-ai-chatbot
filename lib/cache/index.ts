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
// Keys
export { CacheKeys, getChatCacheKeys, parseKeyId } from "./keys";
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
