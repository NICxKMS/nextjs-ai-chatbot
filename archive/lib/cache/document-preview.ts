/**
 * Document Preview Cache
 * Ref: Issue #14 - LRU cache for document HTML previews
 *
 * Hybrid caching strategy for document preview HTML content:
 * 1. **Redis (Primary)**: Shared across serverless instances via Upstash
 * 2. **In-Memory LRU (Fallback)**: Per-instance cache when Redis unavailable
 *
 * @warning SERVERLESS LIMITATION
 * In serverless environments (Vercel, AWS Lambda), in-memory cache is per-instance.
 * Each function invocation may get a different instance with cold cache.
 * Redis is the recommended solution for cross-instance cache sharing.
 *
 * @module lib/cache/document-preview
 */
import "server-only";

import { getRedis, safeRedis } from "./client";
import { CacheKeys } from "./keys";

// =============================================================================
// TYPES
// =============================================================================

export type CachedPreview = {
    /** Rendered HTML content */
    html: string;
    /** Unix timestamp when preview was generated */
    generatedAt: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of cached previews */
const MAX_ENTRIES = 100;

/** Cache TTL: 5 minutes in milliseconds */
const TTL_MS = 5 * 60 * 1000;

/** Redis TTL: 5 minutes in seconds */
const REDIS_TTL_SECONDS = 5 * 60;

/** Consecutive cache miss threshold for logging */
const CACHE_MISS_LOG_THRESHOLD = 10;

/** Counter for consecutive cache misses (monitoring) */
let consecutiveCacheMisses = 0;

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

/**
 * Simple LRU cache with TTL support.
 * Uses Map's insertion order for LRU eviction.
 */
class LRUCache<K, V> {
    private readonly cache: Map<K, { value: V; expiresAt: number }>;
    private readonly maxSize: number;
    private readonly ttl: number;

    constructor(options: { max: number; ttl: number }) {
        this.cache = new Map();
        this.maxSize = options.max;
        this.ttl = options.ttl;
    }

    /**
     * Get value from cache, returns undefined if expired or not found
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return;
        }

        // Check TTL
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set value in cache with TTL
     */
    set(key: K, value: V): void {
        // Delete existing entry to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttl,
        });
    }

    /**
     * Delete entry from cache
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size
     */
    get size(): number {
        return this.cache.size;
    }
}

// =============================================================================
// PREVIEW CACHE INSTANCE
// =============================================================================

/**
 * Global preview cache instance (in-memory fallback).
 *
 * @warning SERVERLESS LIMITATION
 * In serverless environments, this cache is per-instance and not shared.
 * Redis is used as primary cache; this serves as fallback when Redis unavailable.
 *
 * @note Cache Warming: Not implemented - Redis handles persistence across instances.
 * For high-traffic scenarios, consider preloading recent documents on cold start.
 */
const previewCache = new LRUCache<string, CachedPreview>({
    max: MAX_ENTRIES,
    ttl: TTL_MS,
});

// =============================================================================
// REDIS HELPERS
// =============================================================================

/**
 * Get preview from Redis cache
 */
async function getFromRedis(documentId: string): Promise<CachedPreview | null> {
    const redis = getRedis();
    if (!redis) {
        return null;
    }

    const data = await safeRedis(() =>
        redis.get<CachedPreview>(CacheKeys.documentPreview(documentId))
    );

    return data ?? null;
}

/**
 * Set preview in Redis cache with TTL
 */
async function setInRedis(
    documentId: string,
    preview: CachedPreview
): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
        return false;
    }

    const result = await safeRedis(() =>
        redis.set(CacheKeys.documentPreview(documentId), preview, {
            ex: REDIS_TTL_SECONDS,
        })
    );

    return result === "OK";
}

/**
 * Delete preview from Redis cache
 */
async function deleteFromRedis(documentId: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) {
        return false;
    }

    const result = await safeRedis(() =>
        redis.del(CacheKeys.documentPreview(documentId))
    );

    return (result ?? 0) > 0;
}

/**
 * Log cache miss warning if threshold exceeded
 */
function logCacheMissWarning(): void {
    consecutiveCacheMisses++;
    if (consecutiveCacheMisses >= CACHE_MISS_LOG_THRESHOLD) {
        console.warn(
            `[DocumentPreviewCache] ${consecutiveCacheMisses} consecutive cache misses. ` +
                "Consider checking Redis connectivity or cache key patterns."
        );
        consecutiveCacheMisses = 0; // Reset after logging
    }
}

/**
 * Reset cache miss counter on hit
 */
function resetCacheMissCounter(): void {
    consecutiveCacheMisses = 0;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get cached document preview or generate new one.
 *
 * @param documentId - Document ID to get preview for
 * @param generateFn - Function to generate preview HTML if not cached
 * @returns Cached or newly generated preview
 *
 * @example
 * ```ts
 * const preview = await getDocumentPreview(docId, async () => {
 *   const doc = await getDocument(docId);
 *   return renderDocumentToHtml(doc);
 * });
 * ```
 */
export async function getDocumentPreview(
    documentId: string,
    generateFn: () => Promise<string>
): Promise<CachedPreview> {
    // 1. Check in-memory cache first (fastest)
    const memoryCached = previewCache.get(documentId);
    if (memoryCached) {
        resetCacheMissCounter();
        return memoryCached;
    }

    // 2. Check Redis cache (shared across serverless instances)
    const redisCached = await getFromRedis(documentId);
    if (redisCached) {
        // Populate in-memory cache for subsequent requests in this instance
        previewCache.set(documentId, redisCached);
        resetCacheMissCounter();
        return redisCached;
    }

    // 3. Cache miss - generate new preview
    logCacheMissWarning();

    const html = await generateFn();
    const preview: CachedPreview = {
        html,
        generatedAt: Date.now(),
    };

    // 4. Store in both caches (Redis + in-memory)
    previewCache.set(documentId, preview);
    await setInRedis(documentId, preview); // Fire-and-forget (best effort)

    return preview;
}

/**
 * Get cached preview without generating (cache-only lookup).
 * Checks both Redis and in-memory cache.
 *
 * @param documentId - Document ID to look up
 * @returns Cached preview or null if not found/expired
 */
export async function getCachedPreview(
    documentId: string
): Promise<CachedPreview | null> {
    // Check in-memory first
    const memoryCached = previewCache.get(documentId);
    if (memoryCached) {
        return memoryCached;
    }

    // Check Redis
    const redisCached = await getFromRedis(documentId);
    if (redisCached) {
        // Populate in-memory cache
        previewCache.set(documentId, redisCached);
        return redisCached;
    }

    return null;
}

/**
 * Set preview in cache manually.
 * Stores in both Redis and in-memory cache.
 *
 * @param documentId - Document ID
 * @param html - HTML content to cache
 */
export async function setDocumentPreview(
    documentId: string,
    html: string
): Promise<void> {
    const preview: CachedPreview = {
        html,
        generatedAt: Date.now(),
    };

    previewCache.set(documentId, preview);
    await setInRedis(documentId, preview);
}

/**
 * Invalidate (remove) a document preview from cache.
 * Call this when a document is updated or deleted.
 * Removes from both Redis and in-memory cache.
 *
 * @param documentId - Document ID to invalidate
 * @returns true if entry was removed from at least one cache
 */
export async function invalidatePreview(documentId: string): Promise<boolean> {
    const memoryDeleted = previewCache.delete(documentId);
    const redisDeleted = await deleteFromRedis(documentId);
    return memoryDeleted || redisDeleted;
}

/**
 * Invalidate multiple document previews.
 * Removes from both Redis and in-memory cache.
 *
 * @param documentIds - Array of document IDs to invalidate
 * @returns Number of entries invalidated from in-memory cache
 */
export async function invalidatePreviews(
    documentIds: string[]
): Promise<number> {
    let count = 0;
    const deletePromises: Promise<boolean>[] = [];

    for (const id of documentIds) {
        if (previewCache.delete(id)) {
            count++;
        }
        deletePromises.push(deleteFromRedis(id));
    }

    // Wait for all Redis deletions (best effort)
    await Promise.all(deletePromises);

    return count;
}

/**
 * Clear all cached previews.
 * Use sparingly - typically for testing or maintenance.
 */
export function clearPreviewCache(): void {
    previewCache.clear();
}

/**
 * Get current cache statistics.
 * Useful for monitoring and debugging.
 */
export function getPreviewCacheStats(): { size: number; maxSize: number } {
    return {
        size: previewCache.size,
        maxSize: MAX_ENTRIES,
    };
}
