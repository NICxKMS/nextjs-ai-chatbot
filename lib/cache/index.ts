/**
 * Cache Module - Public API
 * Ref: 04-cache-layer-optimal-design.md
 *
 * @module lib/cache
 */

// Types
export type {
    CachedChatMeta,
    CachedMessage,
    CachedChat,
    CachedUserChatItem,
    CachedDocument,
    CachedDocumentVersion,
    CircuitBreakerState,
    CacheOptions,
} from "./types";

// Constants
export {
    GUEST_CACHE_TTL_SECONDS,
    QUOTA_TTL_SECONDS,
    CIRCUIT_FAILURE_THRESHOLD,
    CIRCUIT_RESET_TIMEOUT_MS,
} from "./constants";

// Keys
export { CacheKeys, getChatCacheKeys, parseKeyId } from "./keys";

// Client
export { getRedis, isRedisAvailable, safeRedis } from "./client";

// Circuit breaker
export {
    getCircuitState,
    isCircuitOpen,
    recordFailure,
    recordSuccess,
    withCircuitBreaker,
} from "./circuit-breaker";

// Helpers
export {
    isGuestUserId,
    getMessageScore,
    parseMessageScore,
    getQuotaDateKey,
    serialize,
    deserialize,
    toUnixTimestamp,
    fromUnixTimestamp,
} from "./helpers";
