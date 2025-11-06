import "server-only";

import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
// Uses REST API for serverless compatibility with Vercel
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		console.warn("⚠️  Upstash Redis not configured - caching disabled");
		return null;
	}

	if (!redis) {
		redis = new Redis({
			url: process.env.UPSTASH_REDIS_REST_URL,
			token: process.env.UPSTASH_REDIS_REST_TOKEN,
		});
		console.log("✅ Upstash Redis client initialized");
	}

	return redis;
}

// Helper to check if Redis is available
export function isRedisAvailable(): boolean {
	return getRedisClient() !== null;
}
