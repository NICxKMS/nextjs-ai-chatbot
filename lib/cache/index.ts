/**
 * Cache Module
 *
 * Provides Redis client, cache key generators, caching strategies,
 * invalidation helpers, and quota management for the application.
 * Uses Upstash Redis for serverless-compatible HTTP-based caching.
 *
 * @module lib/cache
 */

// =============================================================================
// Redis Client
// =============================================================================

export {
	checkRedisHealth,
	getRedisClient,
	isRedisAvailable,
	type Redis,
	requireRedisClient,
} from "./client"

// =============================================================================
// Cache Key Generators
// =============================================================================

export {
	artifactKey,
	// Key prefix
	CACHE_KEY_PREFIX,
	// Keys object
	CacheKeys,
	type CacheKeysType,
	// Entity keys
	chatKey,
	chatKeysPattern,
	chatListKey,
	chatMessagesKey,
	// Pattern keys
	chatMessagesPattern,
	// Composite keys
	chatMetaKey,
	messageKey,
	userChatsKey,
	userKey,
	userKeysPattern,
} from "./keys"

// =============================================================================
// Cache Strategies
// =============================================================================

export {
	// Types
	type CacheOptions,
	type CacheResult,
	// Core strategies
	cacheAside,
	cacheThrough,
	type Fetcher,
	getCacheMetrics,
	getOrSet,
	invalidate,
	invalidatePattern,
	type Persister,
	refresh,
	resetCacheMetrics,
	writeBehind,
	writeThrough,
} from "./strategies"

// =============================================================================
// Cache Invalidation
// =============================================================================

export {
	// Utility
	clearAllCache,
	// Pattern-based invalidation
	countKeysByPattern,
	getKeysByPattern,
	// Types
	type InvalidationOptions,
	type InvalidationResult,
	// Entity-specific invalidation
	invalidateArtifact,
	invalidateByPattern,
	invalidateChat,
	invalidateChats,
	invalidateGuest,
	invalidateMessage,
	invalidateMessages,
	invalidateUser,
} from "./invalidation"

// =============================================================================
// Quota Management
// =============================================================================

export {
	// Convenience helpers
	checkAndIncrementMessageQuota,
	// Core quota operations
	checkAndIncrementQuota,
	checkMessageQuota,
	checkQuota,
	// Constants
	DEFAULT_MESSAGE_QUOTA,
	DEFAULT_WINDOW_SECONDS,
	// Cache size tracking
	getCacheKeyCount,
	getQuotaInfo,
	getTotalTrackedSize,
	incrementMessageQuota,
	incrementQuota,
	// Types
	type QuotaCheckResult,
	type QuotaInfo,
	type QuotaOptions,
	resetQuota,
	trackKeySize,
} from "./quota"

// =============================================================================
// Memory Cache (L1)
// =============================================================================

export {
	// Factory function
	createLRUCache,
	// Default instance
	defaultLRUCache,
	// Class
	LRUCache,
	// Types
	type LRUCacheOptions,
	type LRUCacheStats,
	type SetOptions,
} from "./memory-cache"

// =============================================================================
// Tiered Cache (L1 + L2)
// =============================================================================

export {
	createCacheWarmer,
	// Factory function
	createTieredCache,
	// Default instance
	defaultTieredCache,
	// Class
	TieredCache,
	// Types
	type TieredCacheOptions,
	type TieredCacheResult,
	type TieredCacheSetOptions,
	type TieredCacheStats,
	type WarmFetcher,
	// Cache warming utilities
	warmCache,
	warmCacheWithEntries,
} from "./tiered-cache"
