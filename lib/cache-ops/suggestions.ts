/**
 * Suggestion Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing suggestion data in Redis
 *
 * @module lib/cache-ops/suggestions
 */
import "server-only";

import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { getRedis } from "@/lib/cache/client";
import { deserialize, getTTLForUser, serialize } from "@/lib/cache/helpers";
import { CacheKeys } from "@/lib/cache/keys";
import type { UserContext } from "@/lib/cache/types";

/**
 * Cached suggestion structure
 */
export type CachedSuggestion = {
    id: string;
    documentId: string;
    originalText: string;
    suggestedText: string;
    description?: string | null;
    isResolved: boolean;
    createdAt: number; // Unix timestamp
};

/**
 * Get suggestions from cache
 *
 * Return value semantics:
 * - CachedSuggestion[]: Cache hit, suggestions found
 * - null: Cache miss or cache unavailable
 *
 * @param documentId - Document identifier
 * @param ctx - User context
 * @returns Array of suggestions or null if not in cache
 */
export async function getSuggestionsFromCache(
    documentId: string,
    ctx: UserContext
): Promise<CachedSuggestion[] | null> {
    return withCircuitBreaker(
        "getSuggestionsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const key = CacheKeys.suggestions(documentId, ctx.userId);
            const data = await redis.get<string>(key);

            if (data === null) {
                return null;
            }

            return deserialize<CachedSuggestion[]>(data);
        },
        null
    );
}

/**
 * Set suggestions in cache
 *
 * @param documentId - Document identifier
 * @param suggestions - Suggestions to cache
 * @param ctx - User context
 * @returns true if successful, false otherwise
 */
export async function setSuggestionsInCache(
    documentId: string,
    suggestions: CachedSuggestion[],
    ctx: UserContext
): Promise<boolean> {
    return withCircuitBreaker(
        "setSuggestionsInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const key = CacheKeys.suggestions(documentId, ctx.userId);
            const ttl = getTTLForUser(ctx.isGuest);
            await redis.set(key, serialize(suggestions), { ex: ttl });

            return true;
        },
        false
    );
}

/**
 * Delete suggestions from cache
 *
 * @param documentId - Document identifier
 * @param ctx - User context
 * @returns true if successful, false otherwise
 */
export async function deleteSuggestionsFromCache(
    documentId: string,
    ctx: UserContext
): Promise<boolean> {
    return withCircuitBreaker(
        "deleteSuggestionsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const key = CacheKeys.suggestions(documentId, ctx.userId);
            await redis.del(key);

            return true;
        },
        false
    );
}
