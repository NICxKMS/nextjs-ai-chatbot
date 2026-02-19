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
// Circuit Breaker
// =============================================================================

export {
	CIRCUIT_BREAKER_RESET_MS,
	CIRCUIT_BREAKER_THRESHOLD,
	getCircuitBreakerState,
	isCircuitOpen,
	recordCacheFailure,
	recordCacheSuccess,
	resetCircuitBreaker,
} from "./circuit-breaker"

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

// =============================================================================
// Cache Entity Types
// =============================================================================

export {
	// Re-exports from feature modules
	type ArtifactKind,
	type ArtifactPart,
	attachmentToFilePart,
	type CachedChat,
	// Cache entity types
	type CachedChatMeta,
	type CachedDocument,
	type CachedMessage,
	type CodePart,
	type DocumentVersion,
	extractFileUrlsFromParts,
	// Utility functions
	extractTextFromParts,
	type FilePart,
	filePartToAttachment,
	getFileName,
	getMediaType,
	hasReasoning,
	hasToolCalls,
	type ImagePart,
	isArtifactPart,
	// Type guards
	isCachedChatMeta,
	isCachedMessage,
	isFilePart,
	isMessagePart,
	isReasoningPart,
	isTextPart,
	isToolCallPart,
	isToolResultPart,
	isUserChatListItem,
	// Message attachment type
	type MessageAttachment,
	// Message part types
	type MessagePart,
	type ModelPart,
	parseMessageParts,
	type ReasoningPart,
	type SourcePart,
	type StepPart,
	type TextPart,
	type ToolCallPart,
	type ToolResultPart,
	type UnknownPart,
	type UserChatListItem,
	type VisibilityType,
} from "./types"

// =============================================================================
// ZSET Operations
// =============================================================================

export {
	addToChatList,
	getChatList,
	// Core operations
	removeFromChatList,
	// Types
	type ZAddOptions,
	type ZMember,
	zadd,
	// Convenience operations
	zaddOne,
	zcard,
	zgetNewest,
	zgetOldest,
	zrange,
	zrem,
	zremrangebyscore,
	zrevrange,
	zrevrangeWithScores,
	zscore,
} from "./zset"

// =============================================================================
// Type-Safe Casting Utilities
// =============================================================================

export {
	// Types
	type CastError,
	type CastResult,
	// Date handling
	cacheStringToDate,
	cacheStringToTimestamp,
	// Cast functions
	castToAppUsage,
	castToAppUsageOrNull,
	castToCachedChat,
	castToCachedChatMeta,
	castToCachedMessage,
	castToCachedMessages,
	castToUserChatListItem,
	castToUserChatListItems,
	dateToCacheString,
	// JSON utilities
	parseAndCast,
	safeDeserialize,
	safeSerialize,
	timestampToCacheString,
} from "./cast"
