import "server-only";

import { logError } from "@/lib/log";
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
 * Uses Redis hash tag {userId} to ensure keys for the same user
 * are co-located on the same shard in cluster deployments
 */
function getQuotaKey(userId: string, date: string): string {
    return `quota:{${userId}}:${date}`;
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
        logError("Failed to get user message count from cache", error);
        return 0;
    }
}

/**
 * Lua script for atomic increment with TTL
 * Combines INCRBY and EXPIRE into single round-trip
 */
const INCREMENT_WITH_TTL_SCRIPT = `
local key = KEYS[1]
local delta = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local newCount = redis.call('INCRBY', key, delta)

-- Set expiration on first use (when count equals delta, meaning key was new)
if newCount == delta then
	redis.call('EXPIRE', key, ttl)
end

return newCount
`;

/**
 * Increment user message count atomically
 * Uses Lua script for atomic INCRBY + conditional EXPIRE (single round-trip!)
 * Sets 25-hour TTL on first increment of the day
 *
 * @param userId User ID
 * @param delta Amount to increment by (defaults to 1)
 * @returns New count after increment
 */
export async function incrementUserMessageCount(
    userId: string,
    delta = 1
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    if (delta <= 0) {
        return 0;
    }

    try {
        const dateKey = getQuotaDateKey();
        const key = getQuotaKey(userId, dateKey);
        const TTL_25_HOURS = 60 * 60 * 25;

        // Use Lua script for atomic increment with conditional TTL (single round-trip!)
        const newCount = await redis.eval(
            INCREMENT_WITH_TTL_SCRIPT,
            [key],
            [delta.toString(), TTL_25_HOURS.toString()]
        );

        return typeof newCount === "number" ? newCount : 0;
    } catch (error) {
        logError("Failed to increment user message count", error);
        return 0;
    }
}

/**
 * Increment user message count without waiting for result
 * Fire-and-forget for performance
 *
 * @param userId User ID
 * @param delta Amount to increment by (defaults to 1)
 */
export function incrementUserMessageCountAsync(
    userId: string,
    delta = 1
): void {
    // Fire and forget - don't block on this
    incrementUserMessageCount(userId, delta).catch((err) =>
        logError("Async quota increment failed", err)
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
        logError("Failed to reset user quota", error);
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
        logError("Failed to get batch user message counts", error);
        return result;
    }
}
