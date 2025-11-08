import "server-only";

import { getRedisClient } from "./redis";

/**
 * Get the current date key for quota tracking (YYYY-MM-DD format)
 */
function getQuotaDateKey(): string {
	const now = new Date();
	return now.toISOString().split("T")[0] || "";
}

/**
 * Get quota cache key for a user on a specific date
 */
function getQuotaKey(userId: string, date: string): string {
	return `quota:user:${userId}:${date}`;
}

/**
 * Get current message count for user within 24 hours
 * Uses a single Redis GET operation
 * Falls back to 0 if Redis unavailable or key doesn't exist
 *
 * @param userId User ID
 * @returns Current message count
 */
export async function getUserMessageCount(userId: string): Promise<number> {
	const redis = getRedisClient();
	if (!redis) {
		// Redis not available - return 0 to allow request
		// DB fallback will be used if needed
		return 0;
	}

	try {
		const dateKey = getQuotaDateKey();
		const key = getQuotaKey(userId, dateKey);

		const count = await redis.get<number>(key);
		return count ?? 0;
	} catch (error) {
		console.error("Failed to get user message count from cache:", error);
		return 0;
	}
}

/**
 * Increment user message count atomically
 * Uses a single Redis INCR operation
 * Sets 25-hour TTL on first increment of the day
 *
 * @param userId User ID
 * @returns New count after increment
 */
export async function incrementUserMessageCount(
	userId: string
): Promise<number> {
	const redis = getRedisClient();
	if (!redis) {
		return 0;
	}

	try {
		const dateKey = getQuotaDateKey();
		const key = getQuotaKey(userId, dateKey);

		// Atomically increment and get new value
		const newCount = await redis.incr(key);

		// Set expiration on first use (when count is 1)
		// TTL = 25 hours to handle timezone edge cases
		if (newCount === 1) {
			await redis.expire(key, 60 * 60 * 25); // 25 hours in seconds
		}

		return newCount;
	} catch (error) {
		console.error("Failed to increment user message count:", error);
		return 0;
	}
}

/**
 * Increment user message count without waiting for result
 * Fire-and-forget for performance
 *
 * @param userId User ID
 */
export function incrementUserMessageCountAsync(userId: string): void {
	// Fire and forget - don't block on this
	incrementUserMessageCount(userId).catch((err) =>
		console.error("Async quota increment failed:", err)
	);
}

/**
 * Reset user quota (admin/testing purposes)
 *
 * @param userId User ID
 */
export async function resetUserQuota(userId: string): Promise<void> {
	const redis = getRedisClient();
	if (!redis) {
		return;
	}

	try {
		const dateKey = getQuotaDateKey();
		const key = getQuotaKey(userId, dateKey);
		await redis.del(key);
	} catch (error) {
		console.error("Failed to reset user quota:", error);
	}
}

/**
 * Get quota info for multiple users (batch operation)
 *
 * @param userIds Array of user IDs
 * @returns Map of userId to message count
 */
export async function getBatchUserMessageCounts(
	userIds: string[]
): Promise<Map<string, number>> {
	const redis = getRedisClient();
	const result = new Map<string, number>();

	if (!redis || userIds.length === 0) {
		return result;
	}

	try {
		const dateKey = getQuotaDateKey();
		const keys = userIds.map((id) => getQuotaKey(id, dateKey));

		// Use pipeline for batch get
		const pipeline = redis.pipeline();
		for (const key of keys) {
			pipeline.get(key);
		}

		const counts = await pipeline.exec<(number | null)[]>();

		userIds.forEach((userId, index) => {
			result.set(userId, counts[index] ?? 0);
		});

		return result;
	} catch (error) {
		console.error("Failed to get batch user message counts:", error);
		return result;
	}
}
