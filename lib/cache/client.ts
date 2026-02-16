/**
 * Upstash Redis Cache Client
 *
 * Provides a singleton Redis client for caching operations using Upstash Redis.
 * Uses HTTP-based REST API for serverless compatibility.
 *
 * @module lib/cache/client
 */

import "server-only"

import { Redis } from "@upstash/redis"
import { logDebug, logError, logInfo, logWarn } from "@/lib/log"

// =============================================================================
// Global Singleton Pattern
// =============================================================================

/**
 * Global type declaration for Redis singleton.
 * Prevents re-initialization during HMR or warm container reuse.
 */
const globalForRedis = globalThis as unknown as {
	__upstashRedis?: Redis
}

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Get Redis configuration from environment variables.
 * Supports both naming conventions for flexibility.
 */
function getRedisConfig(): { url: string; token: string } | null {
	// Primary: Upstash REST API variables
	const url =
		process.env.CACHE_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
	const token =
		process.env.CACHE_KV_REST_API_TOKEN ||
		process.env.UPSTASH_REDIS_REST_TOKEN

	if (!url || !token) {
		return null
	}

	return { url, token }
}

// =============================================================================
// Redis Client Factory
// =============================================================================

/**
 * Create a new Redis client instance.
 *
 * @param url - Upstash Redis REST URL
 * @param token - Upstash Redis REST token
 * @returns Configured Redis client
 */
function createRedisClient(url: string, token: string): Redis {
	const client = new Redis({
		url,
		token,
		// Enable automatic retries for transient failures
		retry: {
			retries: 3,
			backoff: (retryCount) => Math.exp(retryCount) * 100,
		},
	})

	logInfo("Redis client created", { url: url.replace(/\/[^/]*$/, "/***") })

	return client
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the Redis client singleton instance.
 * Returns null if Redis is not configured (graceful degradation).
 *
 * @returns Redis client instance or null if not configured
 *
 * @example
 * ```typescript
 * const redis = getRedisClient();
 * if (redis) {
 *   await redis.set('key', 'value', { ex: 3600 });
 * }
 * ```
 */
export function getRedisClient(): Redis | null {
	const config = getRedisConfig()

	if (!config) {
		logDebug("Redis not configured - caching disabled")
		return null
	}

	// Return existing singleton if available
	if (globalForRedis.__upstashRedis) {
		return globalForRedis.__upstashRedis
	}

	// Create and cache new client
	try {
		const client = createRedisClient(config.url, config.token)
		globalForRedis.__upstashRedis = client
		return client
	} catch (error) {
		logError("Failed to create Redis client", error as Error)
		return null
	}
}

/**
 * Check if Redis is available and configured.
 *
 * @returns true if Redis client is available
 *
 * @example
 * ```typescript
 * if (isRedisAvailable()) {
 *   // Use caching
 * } else {
 *   // Fallback to direct database queries
 * }
 * ```
 */
export function isRedisAvailable(): boolean {
	return getRedisClient() !== null
}

/**
 * Verify Redis connection health.
 * Sends a PING command to verify connectivity.
 *
 * @returns true if connection is healthy, false otherwise
 *
 * @example
 * ```typescript
 * const isHealthy = await checkRedisHealth();
 * if (!isHealthy) {
 *   logWarn('Redis connection unhealthy');
 * }
 * ```
 */
export async function checkRedisHealth(): Promise<boolean> {
	const client = getRedisClient()

	if (!client) {
		return false
	}

	try {
		const result = await client.ping()
		const isHealthy = result === "PONG"

		if (isHealthy) {
			logDebug("Redis health check passed")
		} else {
			logWarn("Redis health check failed", { result })
		}

		return isHealthy
	} catch (error) {
		logError("Redis health check error", error as Error)
		return false
	}
}

/**
 * Get Redis client or throw an error if not available.
 * Use this when caching is required and not optional.
 *
 * @returns Redis client instance
 * @throws Error if Redis is not configured
 *
 * @example
 * ```typescript
 * const redis = requireRedisClient();
 * await redis.set('key', 'value');
 * ```
 */
export function requireRedisClient(): Redis {
	const client = getRedisClient()

	if (!client) {
		throw new Error(
			"Redis client is not configured. Set CACHE_KV_REST_API_URL and CACHE_KV_REST_API_TOKEN environment variables.",
		)
	}

	return client
}

// =============================================================================
// Convenience Re-exports
// =============================================================================

// Re-export Redis type for consumers
export type { Redis } from "@upstash/redis"
