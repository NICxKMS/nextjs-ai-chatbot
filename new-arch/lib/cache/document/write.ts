import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getDocumentKeys } from "../keys";
import { APPEND_DOCUMENT_VERSION } from "../scripts";
import type { CachedDocument, DocumentVersion } from "../types";

/** Maximum versions to keep per document */
const MAX_DOCUMENT_VERSIONS = 50;

/**
 * Set document in cache.
 * Replaces any existing document data.
 *
 * @param document - Full document object with versions
 * @returns true if written successfully, false otherwise
 */
export async function setDocumentInCache(
    document: CachedDocument
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker("setDocumentInCache", false, async () => {
        const { documentKey } = getDocumentKeys(document.id, document.userId);
        await redis.set(documentKey, document);
        return true;
    });
}

/**
 * Append a new version to document in cache.
 * Automatically enforces version limit.
 *
 * @param documentId - Document ID
 * @param userId - User ID (for namespace isolation)
 * @param version - Version to append
 * @param maxVersions - Maximum versions to keep (default: 50)
 * @returns Number of versions after append, or 0 if document not found
 */
export async function appendDocumentVersionToCache(
    documentId: string,
    userId: string,
    version: DocumentVersion,
    maxVersions: number = MAX_DOCUMENT_VERSIONS
): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
        return 0;
    }

    return await withCircuitBreaker(
        "appendDocumentVersionToCache",
        0,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);

            const result = await redis.eval(
                APPEND_DOCUMENT_VERSION,
                [documentKey],
                [JSON.stringify(version), maxVersions.toString()]
            );

            return typeof result === "number" ? result : 0;
        }
    );
}

/**
 * Create document in cache if it doesn't exist.
 *
 * @param document - Document to create
 * @returns true if created, false if already exists or failed
 */
export async function createDocumentInCacheIfNotExists(
    document: CachedDocument
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "createDocumentInCacheIfNotExists",
        false,
        async () => {
            const { documentKey } = getDocumentKeys(
                document.id,
                document.userId
            );

            // Use SETNX (SET if Not eXists)
            const result = await redis.setnx(documentKey, document);
            return result === 1;
        }
    );
}

/**
 * Update document metadata in cache (not versions).
 *
 * @param documentId - Document ID
 * @param userId - User ID
 * @param updates - Fields to update (chatId only currently)
 * @returns true if updated, false otherwise
 */
export async function updateDocumentInCache(
    documentId: string,
    userId: string,
    updates: Partial<Pick<CachedDocument, "chatId">>
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker(
        "updateDocumentInCache",
        false,
        async () => {
            const { documentKey } = getDocumentKeys(documentId, userId);

            const doc = await redis.get<CachedDocument>(documentKey);
            if (!doc) {
                return false;
            }

            const updated: CachedDocument = {
                ...doc,
                ...updates,
            };

            await redis.set(documentKey, updated);
            return true;
        }
    );
}
