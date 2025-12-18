import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getDocumentKeys } from "../keys";
import type { CachedDocument, DocumentVersion } from "../types";

/**
 * Get document from cache.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns Cached document or null if not found
 */
export async function getDocumentFromCache(
    documentId: string,
    userId: string
): Promise<CachedDocument | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    return await withCircuitBreaker("getDocumentFromCache", null, async () => {
        const { documentKey } = getDocumentKeys(documentId, userId);
        return await redis.get<CachedDocument>(documentKey);
    });
}

/**
 * Get document versions from cache.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns Array of document versions or empty array if not found
 */
export async function getDocumentVersionsFromCache(
    documentId: string,
    userId: string
): Promise<DocumentVersion[]> {
    const redis = getRedisClient();
    if (!redis) {
        return [];
    }

    return await withCircuitBreaker(
        "getDocumentVersionsFromCache",
        [],
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);
            const doc = await redis.get<CachedDocument>(documentKey);
            return doc?.versions ?? [];
        }
    );
}

/**
 * Get latest document version from cache.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns Latest version or null if not found
 */
export async function getLatestDocumentVersionFromCache(
    documentId: string,
    userId: string
): Promise<DocumentVersion | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }

    return await withCircuitBreaker(
        "getLatestDocumentVersionFromCache",
        null,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);
            const doc = await redis.get<CachedDocument>(documentKey);
            if (!doc || doc.versions.length === 0) {
                return null;
            }
            return doc.versions.at(-1) ?? null;
        }
    );
}

/**
 * Check if document exists in cache.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns true if document exists in cache
 */
export async function documentExistsInCache(
    documentId: string,
    userId: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "documentExistsInCache",
        false,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);
            const exists = await redis.exists(documentKey);
            return exists === 1;
        }
    );
}
