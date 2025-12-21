/**
 * Quota Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing rate limiting and quota in Redis.
 * Uses atomic Lua scripts for accurate counting.
 *
 * @module lib/cache-ops/quota
 */
import "server-only";

import { getRedis } from "@/lib/cache/client";
import { CacheKeys } from "@/lib/cache/keys";
import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { QUOTA_TTL_SECONDS } from "@/lib/cache/constants";
import { INCREMENT_QUOTA_SCRIPT } from "./scripts";

/**
 * Default daily quota limit
 */
const DEFAULT_QUOTA_LIMIT = 100;

/**
 * Get current date in YYYY-MM-DD format
 */
function getDateKey(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Check current quota usage
 *
 * @param userId - User identifier
 * @param limit - Quota limit (default: 100)
 * @returns Quota info or null if cache unavailable
 */
export async function checkQuota(
    userId: string,
    limit: number = DEFAULT_QUOTA_LIMIT
): Promise<{ count: number; remaining: number; limit: number } | null> {
    return withCircuitBreaker(
        "checkQuota",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const dateKey = getDateKey();
            const quotaKey = CacheKeys.quota(userId, dateKey);

            const countStr = await redis.get(quotaKey);
            const count = countStr ? parseInt(String(countStr), 10) : 0;
            const remaining = Math.max(0, limit - count);

            return { count, remaining, limit };
        },
        null
    );
}

/**
 * Increment quota with limit check (atomic)
 *
 * Uses Lua script for atomic check-and-increment to prevent race conditions.
 *
 * @param userId - User identifier
 * @param amount - Amount to increment (default: 1)
 * @param limit - Quota limit (default: 100)
 * @returns Result with allowed flag, current count, and limit
 */
export async function incrementQuota(
    userId: string,
    amount: number = 1,
    limit: number = DEFAULT_QUOTA_LIMIT
): Promise<{ allowed: boolean; count: number; limit: number }> {
    return withCircuitBreaker(
        "incrementQuota",
        async () => {
            const redis = getRedis();
            if (!redis) {
                // Cache unavailable - allow operation (fail open)
                return { allowed: true, count: 0, limit };
            }

            const dateKey = getDateKey();
            const quotaKey = CacheKeys.quota(userId, dateKey);

            // Script returns: [accepted(0/1), currentCount, limit]
            const result = (await redis.eval(
                INCREMENT_QUOTA_SCRIPT,
                [quotaKey],
                [amount.toString(), QUOTA_TTL_SECONDS.toString(), limit.toString()]
            )) as [number, number, number];

            const [accepted, count, returnedLimit] = result;

            return {
                allowed: accepted === 1,
                count,
                limit: returnedLimit,
            };
        },
        // Fail open - allow if cache is unavailable
        { allowed: true, count: 0, limit }
    );
}

/**
 * Reset quota (admin use)
 *
 * Deletes the quota key for the current day.
 *
 * @param userId - User identifier
 * @returns true if reset successful, false otherwise
 */
export async function resetQuota(userId: string): Promise<boolean> {
    return withCircuitBreaker(
        "resetQuota",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const dateKey = getDateKey();
            const quotaKey = CacheKeys.quota(userId, dateKey);

            const deleted = await redis.del(quotaKey);
            return deleted > 0;
        },
        false
    );
}

/**
 * Check if quota allows operation (convenience)
 *
 * Use this for quick checks before starting an operation.
 * For actual consumption, use incrementQuota to atomically check and consume.
 *
 * @param userId - User identifier
 * @param limit - Quota limit (default: 100)
 * @returns true if quota available, false if exhausted
 */
export async function isQuotaAvailable(
    userId: string,
    limit: number = DEFAULT_QUOTA_LIMIT
): Promise<boolean> {
    const result = await checkQuota(userId, limit);
    if (!result) {
        // Cache unavailable - allow operation (fail open)
        return true;
    }
    return result.count < limit;
}
