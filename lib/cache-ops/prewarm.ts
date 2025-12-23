/**
 * Cache Prewarming Utilities
 * Ref: PERF-004 - Cache Prewarming
 *
 * Proactively warms critical caches to eliminate cold-start latency.
 * Call after successful authentication or when user context is available.
 *
 * Strategy:
 * - Non-blocking: Uses Promise.allSettled so partial failures don't break auth flow
 * - Smart: Only prewarms if cache is cold (avoids redundant work)
 * - Efficient: Uses 5-minute warmed flag to prevent repeated prewarms
 *
 * @module lib/cache-ops/prewarm
 */
import "server-only";

import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { getRedis } from "@/lib/cache/client";
import type { CachedChatMeta } from "@/lib/cache/types";
import { createChatInCache, getUserChatsFromCache } from "@/lib/cache-ops";
import { createContext } from "@/lib/data/base";
import { listChats } from "@/lib/data/chat";
import type { DataContext } from "@/lib/data/types";
import type { Chat } from "@/lib/db";

// ============================================================================
// Constants
// ============================================================================

/** PERF-004: Cache key prefix for prewarm status */
const PREWARM_KEY_PREFIX = "prewarm:user:";

/** PERF-004: How long to remember that cache was warmed (5 minutes) */
const PREWARM_FLAG_TTL = 300;

/** PERF-004: Max recent chats to prewarm */
const RECENT_CHATS_LIMIT = 5;

// ============================================================================
// Core Prewarm Functions
// ============================================================================

/**
 * PERF-004: Prewarm critical caches for a user.
 *
 * Call this after successful authentication or when user context is available.
 * Uses Promise.allSettled to ensure partial failures don't break the flow.
 *
 * Prewarms:
 * - Chat list cache (user's recent chats)
 * - Individual chat metadata for recent chats
 *
 * @param userId - User ID to prewarm caches for
 * @param userType - User type (regular/guest) - guests skip DB calls
 */
export async function prewarmUserCache(
    userId: string,
    userType: "regular" | "guest" = "regular"
): Promise<void> {
    // Guests don't need DB prewarm (cache-only mode)
    if (userType === "guest") {
        return;
    }

    const ctx = createContext(userId, userType);

    await Promise.allSettled([
        // Prewarm chat list
        prewarmChatList(ctx),
        // Future: Add more prewarm targets as needed
        // prewarmSettings(userId),
        // prewarmRecentMessages(userId),
    ]);
}

/**
 * PERF-004: Smart prewarm - only warms if cache is cold.
 *
 * Checks a short-lived flag to avoid repeated prewarms within 5 minutes.
 * Safe to call frequently (e.g., on every page load) without performance impact.
 *
 * @param userId - User ID to check/prewarm
 * @param userType - User type (regular/guest)
 */
export async function prewarmIfCold(
    userId: string,
    userType: "regular" | "guest" = "regular"
): Promise<void> {
    // Guests don't need prewarm
    if (userType === "guest") {
        return;
    }

    const isWarmed = await isCacheWarmed(userId);
    if (isWarmed) {
        return;
    }

    await prewarmUserCache(userId, userType);
    await setCacheWarmed(userId);
}

// ============================================================================
// Individual Cache Prewarmers
// ============================================================================

/**
 * PERF-004: Prewarm user's chat list cache.
 *
 * Loads recent chats from DB and populates cache.
 * This eliminates cold-start latency on first sidebar load.
 *
 * @param ctx - Data context with user info
 */
async function prewarmChatList(ctx: DataContext): Promise<void> {
    // Check if cache is already populated
    const cached = await getUserChatsFromCache(ctx.userId, {
        limit: 1,
    });

    // If we already have cached data, skip DB call
    if (cached && cached.length > 0) {
        return;
    }

    // Load from DB
    const result = await listChats(ctx, { limit: RECENT_CHATS_LIMIT });

    // Warm cache with each chat's metadata
    await Promise.allSettled(
        result.items.map((chat) =>
            createChatInCache(chatToCachedMeta(chat), false)
        )
    );
}

// ============================================================================
// Prewarm Status Tracking
// ============================================================================

/**
 * PERF-004: Check if user's cache has been recently warmed.
 *
 * @param userId - User ID to check
 * @returns true if cache was warmed within TTL window
 */
async function isCacheWarmed(userId: string): Promise<boolean> {
    return withCircuitBreaker(
        "isCacheWarmed",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const key = `${PREWARM_KEY_PREFIX}${userId}`;
            const value = await redis.get<string>(key);
            return value === "1";
        },
        false
    );
}

/**
 * PERF-004: Mark user's cache as warmed.
 *
 * Sets a short-lived flag to prevent repeated prewarms.
 *
 * @param userId - User ID to mark as warmed
 */
async function setCacheWarmed(userId: string): Promise<void> {
    return withCircuitBreaker(
        "setCacheWarmed",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return;
            }

            const key = `${PREWARM_KEY_PREFIX}${userId}`;
            await redis.set(key, "1", { ex: PREWARM_FLAG_TTL });
        },
        undefined
    );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert DB Chat to CachedChatMeta for cache storage.
 */
function chatToCachedMeta(chat: Chat): CachedChatMeta {
    return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        visibility: chat.visibility,
        createdAt: chat.createdAt.getTime(),
        updatedAt: chat.updatedAt.getTime(),
        version: 1,
    };
}
