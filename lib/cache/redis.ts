/**
 * Redis Client
 * @module @/lib/cache/redis
 *
 * Upstash Redis client with type-safe operations.
 */
import "server-only";

import { Redis } from "@upstash/redis";

// Create Redis client
function createRedisClient(): Redis | null {
	if (
		!process.env.UPSTASH_REDIS_REST_URL ||
		!process.env.UPSTASH_REDIS_REST_TOKEN
	) {
		console.warn("Redis environment variables not set - cache disabled");
		return null;
	}

	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	});
}

const redisClient = createRedisClient();

/**
 * Type-safe get operation
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
	if (!redisClient) return null;

	try {
		const value = await redisClient.get<T>(key);
		return value;
	} catch (error) {
		console.error(`Cache get error for key ${key}:`, error);
		return null;
	}
}

/**
 * Type-safe set operation with TTL
 */
export async function cacheSet<T>(
	key: string,
	value: T,
	ttlSeconds?: number,
): Promise<boolean> {
	if (!redisClient) return false;

	try {
		if (ttlSeconds) {
			await redisClient.setex(key, ttlSeconds, value);
		} else {
			await redisClient.set(key, value);
		}
		return true;
	} catch (error) {
		console.error(`Cache set error for key ${key}:`, error);
		return false;
	}
}

/**
 * Delete cache entry
 */
export async function cacheDel(key: string): Promise<boolean> {
	if (!redisClient) return false;

	try {
		await redisClient.del(key);
		return true;
	} catch (error) {
		console.error(`Cache delete error for key ${key}:`, error);
		return false;
	}
}

/**
 * Delete multiple cache entries by pattern
 */
export async function cacheDelByPattern(pattern: string): Promise<number> {
	if (!redisClient) return 0;

	try {
		const keys = await redisClient.keys(pattern);
		if (keys.length === 0) return 0;

		await redisClient.del(...keys);
		return keys.length;
	} catch (error) {
		console.error(`Cache delete by pattern error for ${pattern}:`, error);
		return 0;
	}
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
	return redisClient !== null;
}

/**
 * Export raw client for advanced operations
 */
export const redis = redisClient;
