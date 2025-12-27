/**
 * Cache Layer
 * @module @/lib/cache
 *
 * This barrel export provides caching utilities.
 */

// Cache key definitions
export { type CacheKey, type CacheTTL, cacheKeys, cacheTTL } from "./keys";

// Redis client and operations
export {
	cacheDel,
	cacheDelByPattern,
	cacheGet,
	cacheSet,
	isCacheAvailable,
	redis,
} from "./redis";

// Higher-level cache utilities
export {
	batchGet,
	cacheAside,
	cacheAsideNullable,
	invalidate,
	invalidateMany,
	writeThrough,
} from "./utils";
