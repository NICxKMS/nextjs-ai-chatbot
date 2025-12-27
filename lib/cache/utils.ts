/**
 * Cache Utilities
 * @module @/lib/cache/utils
 *
 * Higher-level caching utilities for common patterns.
 */

import { type CacheKey, cacheTTL } from "./keys";
import { cacheDel, cacheGet, cacheSet } from "./redis";

/**
 * Cache-aside pattern: Get from cache or fetch and cache
 */
export async function cacheAside<T>(
	key: CacheKey,
	fetcher: () => Promise<T>,
	ttl: number = cacheTTL.medium,
): Promise<T> {
	// Try cache first
	const cached = await cacheGet<T>(key);
	if (cached !== null) {
		return cached;
	}

	// Fetch from source
	const value = await fetcher();

	// Cache the result (fire and forget)
	void cacheSet(key, value, ttl);

	return value;
}

/**
 * Cache-aside with null handling (caches null values to prevent repeated misses)
 */
export async function cacheAsideNullable<T>(
	key: CacheKey,
	fetcher: () => Promise<T | null>,
	ttl: number = cacheTTL.medium,
	nullTtl: number = cacheTTL.short,
): Promise<T | null> {
	// Try cache first
	const cached = await cacheGet<T | { __null: true }>(key);

	if (cached !== null) {
		// Check if this is a cached null value
		if (typeof cached === "object" && "__null" in cached) {
			return null;
		}
		return cached as T;
	}

	// Fetch from source
	const value = await fetcher();

	// Cache the result (including null)
	if (value === null) {
		void cacheSet(key, { __null: true }, nullTtl);
	} else {
		void cacheSet(key, value, ttl);
	}

	return value;
}

/**
 * Write-through: Update cache when writing to DB
 */
export async function writeThrough<T>(
	key: CacheKey,
	value: T,
	ttl: number = cacheTTL.medium,
): Promise<boolean> {
	return cacheSet(key, value, ttl);
}

/**
 * Invalidate cache entry
 */
export async function invalidate(key: CacheKey): Promise<boolean> {
	return cacheDel(key);
}

/**
 * Invalidate multiple related cache entries
 */
export async function invalidateMany(keys: CacheKey[]): Promise<void> {
	await Promise.all(keys.map((key) => cacheDel(key)));
}

/**
 * Batch cache operations for efficiency
 */
export async function batchGet<T>(
	keys: CacheKey[],
): Promise<Map<CacheKey, T | null>> {
	const results = await Promise.all(
		keys.map(async (key) => {
			const value = await cacheGet<T>(key);
			return [key, value] as const;
		}),
	);

	return new Map(results);
}
