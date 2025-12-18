import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Global singleton for Upstash Redis client.
 *
 * Upstash Redis uses HTTP-based connections which are:
 * - Stateless and safe to reuse across requests
 * - Edge-compatible (no TCP required)
 * - Serverless-friendly (no connection pooling needed)
 *
 * We use a global singleton to:
 * - Avoid re-initializing during HMR in development
 * - Reuse connections in warm serverless containers
 */
const globalForRedis = globalThis as unknown as {
    __upstashRedis?: Redis;
};

/**
 * Get the Redis client singleton.
 * Returns null if Redis is not configured (missing env vars).
 *
 * Required environment variables:
 * - CACHE_KV_REST_API_URL: Upstash REST API URL
 * - CACHE_KV_REST_API_TOKEN: Upstash REST API token
 *
 * @returns Redis client instance or null if unavailable
 */
export function getRedisClient(): Redis | null {
    const url = process.env.CACHE_KV_REST_API_URL;
    const token = process.env.CACHE_KV_REST_API_TOKEN;

    if (!(url && token)) {
        return null;
    }

    if (!globalForRedis.__upstashRedis) {
        globalForRedis.__upstashRedis = new Redis({
            url,
            token,
        });
    }

    return globalForRedis.__upstashRedis;
}

/**
 * Check if Redis is available and configured.
 *
 * @returns true if Redis client can be created
 */
export function isRedisAvailable(): boolean {
    return getRedisClient() !== null;
}

/**
 * Get Redis client or throw if unavailable.
 * Use this when Redis is required for the operation.
 *
 * @throws Error if Redis is not configured
 * @returns Redis client instance
 */
export function requireRedisClient(): Redis {
    const client = getRedisClient();
    if (!client) {
        throw new Error(
            "Redis is not configured. Set CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN environment variables."
        );
    }
    return client;
}
