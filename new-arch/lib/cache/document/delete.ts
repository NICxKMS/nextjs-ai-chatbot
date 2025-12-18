import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getDocumentKeys } from "../keys";
import { DELETE_DOCUMENT_VERSIONS_AFTER } from "../scripts";
import type { CachedDocument } from "../types";

/**
 * Delete document from cache.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns true if deleted (or didn't exist), false on error
 */
export async function deleteDocumentFromCache(
    documentId: string,
    userId: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "deleteDocumentFromCache",
        false,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);
            await redis.del(documentKey);
            return true;
        }
    );
}

/**
 * Delete multiple documents from cache.
 *
 * @param documentIds - Array of document IDs
 * @param userId - User ID (for namespace isolation)
 * @returns Number of documents deleted
 */
export async function deleteDocumentsFromCache(
    documentIds: string[],
    userId: string
): Promise<number> {
    const redis = getRedisClient();
    if (!redis || documentIds.length === 0) {
        return 0;
    }

    return await withCircuitBreaker(
        "deleteDocumentsFromCache",
        0,
        async (): Promise<number> => {
            const keys = documentIds.map(
                (id) => getDocumentKeys(id, userId).documentKey
            );

            const pipeline = redis.pipeline();
            for (const key of keys) {
                pipeline.del(key);
            }

            const results = await pipeline.exec();
            // Count successful deletions (each del returns 0 or 1)
            return results.reduce(
                (count: number, result) => count + (result === 1 ? 1 : 0),
                0
            );
        }
    );
}

/**
 * Delete document versions after a specific timestamp.
 * Keeps versions created at or before the timestamp.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @param timestamp - ISO timestamp string
 * @returns Number of remaining versions, or 0 if document not found
 */
export async function deleteDocumentVersionsAfterTimestamp(
    documentId: string,
    userId: string,
    timestamp: string
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    return await withCircuitBreaker(
        "deleteDocumentVersionsAfterTimestamp",
        0,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);

            const result = await redis.eval(
                DELETE_DOCUMENT_VERSIONS_AFTER,
                [documentKey],
                [timestamp]
            );

            return typeof result === "number" ? result : 0;
        }
    );
}

/**
 * Clear all versions from a document (keep document shell).
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @returns true if cleared, false otherwise
 */
export async function clearDocumentVersionsFromCache(
    documentId: string,
    userId: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "clearDocumentVersionsFromCache",
        false,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);

            const doc = await redis.get<CachedDocument>(documentKey);
            if (!doc) {
                return false;
            }

            const cleared: CachedDocument = {
                ...doc,
                versions: [],
            };

            await redis.set(documentKey, cleared);
            return true;
        }
    );
}
