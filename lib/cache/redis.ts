import "server-only";

import { Redis } from "@upstash/redis";

// Upstash Redis over HTTP is stateless and safe to reuse.
// Use a global singleton to avoid re-initializing during HMR or warm container reuse.
const globalForRedis = globalThis as unknown as {
	__upstashRedis?: Redis;
};

export function getRedisClient(): Redis | null {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;

	if (!url || !token) {
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

// Helper to check if Redis is available
export function isRedisAvailable(): boolean {
	return getRedisClient() !== null;
}
