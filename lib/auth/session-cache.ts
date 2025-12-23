/**
 * Session Validation Cache
 * Ref: NET-002 Network Optimization
 *
 * Caches Supabase session validation results in Redis.
 * Reduces network latency by avoiding repeated getUser() API calls.
 *
 * Security: Cache key is user ID, value is validated session.
 * Short TTL (30s) ensures session revocation propagates quickly.
 *
 * CLN-004: Improved error handling with proper logging.
 */
import "server-only";

import { getRedis } from "@/lib/cache/client";
import { logger } from "@/lib/utils/logger";
import type { AppSession } from "./types";

/** Session cache TTL in seconds */
const SESSION_CACHE_TTL = 30;

/** Cache key prefix for session validation */
const SESSION_CACHE_PREFIX = "session:valid:";

/**
 * Generate cache key for session validation result
 */
function getSessionCacheKey(userId: string): string {
    return `${SESSION_CACHE_PREFIX}${userId}`;
}

/**
 * Get cached session validation result
 *
 * @param userId - User ID from JWT
 * @returns Cached session or null if not found/expired
 */
export async function getCachedSession(
    userId: string
): Promise<AppSession | null> {
    const redis = getRedis();
    if (!redis) {
        return null;
    }

    try {
        const cached = await redis.get<AppSession>(getSessionCacheKey(userId));
        return cached;
    } catch (error) {
        // CLN-004: Log cache errors for debugging, but don't break auth flow
        logger.warn("[session-cache] getCachedSession failed", {
            userId: `${userId.slice(0, 8)}...`,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Cache session validation result
 *
 * @param userId - User ID from validated session
 * @param session - Validated session to cache
 */
export async function setCachedSession(
    userId: string,
    session: AppSession
): Promise<void> {
    const redis = getRedis();
    if (!redis) {
        return;
    }

    try {
        await redis.set(getSessionCacheKey(userId), session, {
            ex: SESSION_CACHE_TTL,
        });
    } catch (error) {
        // CLN-004: Log cache errors for debugging, but don't break auth flow
        logger.warn("[session-cache] setCachedSession failed", {
            userId: `${userId.slice(0, 8)}...`,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * Invalidate cached session
 * Call this on logout or session revocation.
 *
 * @param userId - User ID whose session should be invalidated
 */
export async function invalidateCachedSession(userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) {
        return;
    }

    try {
        await redis.del(getSessionCacheKey(userId));
    } catch (error) {
        // CLN-004: Log cache errors for debugging (best effort invalidation)
        logger.warn("[session-cache] invalidateCachedSession failed", {
            userId: `${userId.slice(0, 8)}...`,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

/**
 * Extract user ID from Supabase JWT without full verification.
 * Used to get cache key before hitting cache.
 *
 * Note: This does NOT validate the token. It only extracts the subject claim
 * for cache lookup purposes. The actual validation happens in getUser().
 *
 * @param token - Supabase access token (JWT)
 * @returns User ID from token's sub claim, or null if extraction fails
 */
export function extractUserIdFromToken(token: string): string | null {
    try {
        // JWT format: header.payload.signature
        const parts = token.split(".");
        if (parts.length !== 3) {
            return null;
        }

        // Decode payload (base64url)
        const payload = parts[1];
        if (!payload) {
            return null;
        }

        const decoded = Buffer.from(payload, "base64url").toString("utf-8");
        const parsed = JSON.parse(decoded);

        // Supabase stores user ID in 'sub' claim
        return typeof parsed.sub === "string" ? parsed.sub : null;
    } catch (error) {
        // CLN-004: Debug log for token extraction failures (expected for invalid tokens)
        logger.debug("[session-cache] extractUserIdFromToken failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}
