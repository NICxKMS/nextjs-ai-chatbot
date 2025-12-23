/**
 * Document Preview Cache
 * Ref: Issue #14 - LRU cache for document HTML previews
 *
 * Server-side in-memory cache for document preview HTML content.
 * Uses a simple Map-based LRU implementation with TTL support.
 *
 * @module lib/cache/document-preview
 */
import "server-only";

// =============================================================================
// TYPES
// =============================================================================

export type CachedPreview = {
    /** Rendered HTML content */
    html: string;
    /** Unix timestamp when preview was generated */
    generatedAt: number;
};

type CacheEntry = {
    value: CachedPreview;
    /** Expiry timestamp in ms */
    expiresAt: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of cached previews */
const MAX_ENTRIES = 100;

/** Cache TTL: 5 minutes in milliseconds */
const TTL_MS = 5 * 60 * 1000;

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
 * Global preview cache instance.
 * Note: In serverless environments, this cache is per-instance and not shared.
 */
const previewCache = new LRUCache<string, CachedPreview>({
    max: MAX_ENTRIES,
    ttl: TTL_MS,
});

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
    // Check cache first
    const cached = previewCache.get(documentId);
    if (cached) {
        return cached;
    }

    // Generate new preview
    const html = await generateFn();
    const preview: CachedPreview = {
        html,
        generatedAt: Date.now(),
    };

    // Cache the result
    previewCache.set(documentId, preview);

    return preview;
}

/**
 * Get cached preview without generating (cache-only lookup).
 *
 * @param documentId - Document ID to look up
 * @returns Cached preview or null if not found/expired
 */
export function getCachedPreview(documentId: string): CachedPreview | null {
    return previewCache.get(documentId) ?? null;
}

/**
 * Set preview in cache manually.
 *
 * @param documentId - Document ID
 * @param html - HTML content to cache
 */
export function setDocumentPreview(documentId: string, html: string): void {
    previewCache.set(documentId, {
        html,
        generatedAt: Date.now(),
    });
}

/**
 * Invalidate (remove) a document preview from cache.
 * Call this when a document is updated or deleted.
 *
 * @param documentId - Document ID to invalidate
 * @returns true if entry was removed, false if not found
 */
export function invalidatePreview(documentId: string): boolean {
    return previewCache.delete(documentId);
}

/**
 * Invalidate multiple document previews.
 *
 * @param documentIds - Array of document IDs to invalidate
 * @returns Number of entries invalidated
 */
export function invalidatePreviews(documentIds: string[]): number {
    let count = 0;
    for (const id of documentIds) {
        if (previewCache.delete(id)) {
            count++;
        }
    }
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
