/**
 * Redis Client
 * Ref: 04-cache-layer-optimal-design.md §6
 *
 * Upstash Redis HTTP client singleton
 * Extracted from OldApp: oldapp/lib/cache/redis.ts
 */
import "server-only";

import { Redis } from "@upstash/redis";

// Global singleton for HMR safety
const globalForRedis = globalThis as unknown as {
    redis: Redis | null;
    redisInitialized: boolean;
};

/**
 * Get or create Redis client singleton
 * Returns null if environment variables are not configured
 */
export function getRedis(): Redis | null {
    // Return cached instance if available
    if (globalForRedis.redisInitialized) {
        return globalForRedis.redis;
    }

    // Check environment configuration
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn(
            "Redis not configured: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing"
        );
        globalForRedis.redis = null;
        globalForRedis.redisInitialized = true;
        return null;
    }

    // Create client
    globalForRedis.redis = new Redis({ url, token });
    globalForRedis.redisInitialized = true;

    return globalForRedis.redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
    return getRedis() !== null;
}

/**
 * Execute a Redis command with error handling
 * Returns null on any error (graceful degradation)
 */
export async function safeRedis<T>(
    operation: () => Promise<T>
): Promise<T | null> {
    try {
        return await operation();
    } catch (error) {
        console.error("Redis operation failed:", error);
        return null;
    }
}
