/**
 * Document Cache Operations
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Operations for managing documents using ZSET hybrid pattern:
 * - Metadata: STRING (doc:{userId}:{documentId}:meta)
 * - Versions: ZSET ordered by timestamp (doc:{userId}:{documentId}:versions)
 *
 * Key optimization: ZRANGE -1 -1 fetches only latest version (~3KB vs all)
 *
 * @module lib/cache-ops/documents
 */
import "server-only";

import { getRedis } from "@/lib/cache/client";
import { CacheKeys } from "@/lib/cache/keys";
import { withCircuitBreaker } from "@/lib/cache/circuit-breaker";
import { serialize, deserialize, getGuestTTL } from "@/lib/cache/helpers";
import type {
    CachedDocumentMeta,
    CachedDocumentVersion,
} from "@/lib/cache/types";
import {
    APPEND_VERSION_SCRIPT,
    FORK_DOCUMENT_SCRIPT,
    PRUNE_VERSIONS_SCRIPT,
} from "./scripts";

/**
 * Serialize document metadata for Redis storage
 */
function serializeMeta(meta: CachedDocumentMeta): string {
    return serialize(meta);
}

/**
 * Deserialize document metadata from Redis storage
 */
function deserializeMeta(data: string | null): CachedDocumentMeta | null {
    return deserialize<CachedDocumentMeta>(data);
}

/**
 * Serialize version for Redis ZSET storage
 */
function serializeVersion(version: CachedDocumentVersion): string {
    return serialize(version);
}

/**
 * Deserialize version from Redis ZSET storage
 */
function deserializeVersion(data: string | null): CachedDocumentVersion | null {
    return deserialize<CachedDocumentVersion>(data);
}

/**
 * Create document (metadata + first version)
 *
 * @param meta - Document metadata to store
 * @param firstVersion - Initial version content
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function createDocumentInCache(
    meta: CachedDocumentMeta,
    firstVersion: CachedDocumentVersion,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "createDocumentInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.documentMeta(meta.userId, meta.id);
            const versionsKey = CacheKeys.documentVersions(meta.userId, meta.id);
            const userDocsKey = CacheKeys.userDocuments(meta.userId);
            const score = firstVersion.createdAt;
            const ttl = getGuestTTL(isGuest);

            // Use APPEND_VERSION_SCRIPT (creates if not exists)
            const result = await redis.eval(
                APPEND_VERSION_SCRIPT,
                [metaKey, versionsKey],
                [
                    serializeMeta(meta),
                    serializeVersion(firstVersion),
                    score.toString(),
                    ttl.toString(),
                ]
            );

            // Add to user's document list with atomic TTL
            const pipeline = redis.pipeline();
            pipeline.zadd(userDocsKey, { score, member: meta.id });
            if (ttl > 0) {
                pipeline.expire(userDocsKey, ttl);
            }
            await pipeline.exec();

            return typeof result === "number" && result >= 1;
        },
        false
    );
}

/**
 * Get document metadata only
 *
 * Return value semantics:
 * - CachedDocumentMeta: Cache hit, metadata found
 * - null: Cache miss (key doesn't exist) OR cache unavailable
 *
 * Note: null for both miss and unavailable is safe for graceful degradation
 * since both cases should fall through to database lookup.
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @returns Document metadata or null if not in cache/unavailable
 */
export async function getDocumentMetaFromCache(
    userId: string,
    documentId: string
): Promise<CachedDocumentMeta | null> {
    return withCircuitBreaker(
        "getDocumentMetaFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const metaKey = CacheKeys.documentMeta(userId, documentId);
            const data = await redis.get<string>(metaKey);

            return deserializeMeta(data);
        },
        null
    );
}

/**
 * Get latest version only (bandwidth optimized)
 *
 * Key optimization: ZRANGE -1 -1 fetches only the last element
 * instead of all versions. Returns ~3KB instead of full history.
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @returns Latest version or null if not in cache
 */
export async function getLatestVersionFromCache(
    userId: string,
    documentId: string
): Promise<CachedDocumentVersion | null> {
    return withCircuitBreaker(
        "getLatestVersionFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const versionsKey = CacheKeys.documentVersions(userId, documentId);
            // ZRANGE -1 -1 returns only the last element (highest score)
            const versions = await redis.zrange(versionsKey, -1, -1);

            if (!versions || versions.length === 0) {
                return null;
            }

            return deserializeVersion(versions[0] as string);
        },
        null
    );
}

/**
 * Get document with latest version (common use case)
 *
 * Uses pipeline for efficiency: GET meta + ZRANGE versions -1 -1
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @returns Object with meta and latest version, or null if not in cache
 */
export async function getDocumentWithLatestFromCache(
    userId: string,
    documentId: string
): Promise<{ meta: CachedDocumentMeta; version: CachedDocumentVersion } | null> {
    return withCircuitBreaker(
        "getDocumentWithLatestFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const metaKey = CacheKeys.documentMeta(userId, documentId);
            const versionsKey = CacheKeys.documentVersions(userId, documentId);

            // Pipeline: GET meta + ZRANGE versions -1 -1
            const pipeline = redis.pipeline();
            pipeline.get(metaKey);
            pipeline.zrange(versionsKey, -1, -1);

            const results = await pipeline.exec();

            if (!results || results.length !== 2) {
                return null;
            }

            const [metaResult, versionsResult] = results;
            const metaData = metaResult as string | null;
            const versions = versionsResult as string[] | null;

            if (!metaData || !versions || versions.length === 0) {
                return null;
            }

            const meta = deserializeMeta(metaData);
            const versionData = versions[0];
            if (!versionData) {
                return null;
            }
            const version = deserializeVersion(versionData);

            if (!meta || !version) {
                return null;
            }

            return { meta, version };
        },
        null
    );
}

/**
 * Get all versions (for history view)
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @returns Array of all versions ordered by timestamp, or null if not in cache
 */
export async function getAllVersionsFromCache(
    userId: string,
    documentId: string
): Promise<CachedDocumentVersion[] | null> {
    return withCircuitBreaker(
        "getAllVersionsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const versionsKey = CacheKeys.documentVersions(userId, documentId);
            // ZRANGE 0 -1 returns all elements in order
            const versions = await redis.zrange(versionsKey, 0, -1);

            if (!versions || versions.length === 0) {
                return null;
            }

            const parsed: CachedDocumentVersion[] = [];
            for (const v of versions) {
                const version = deserializeVersion(v as string);
                if (version) {
                    parsed.push(version);
                }
            }

            return parsed.length > 0 ? parsed : null;
        },
        null
    );
}

/**
 * Append new version to document
 *
 * Uses APPEND_VERSION_SCRIPT for atomic operation.
 * Score = timestamp for ordering.
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @param version - New version to append
 * @param isGuest - Whether user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function appendVersionToCache(
    userId: string,
    documentId: string,
    version: CachedDocumentVersion,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "appendVersionToCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.documentMeta(userId, documentId);
            const versionsKey = CacheKeys.documentVersions(userId, documentId);
            const userDocsKey = CacheKeys.userDocuments(userId);
            const score = version.createdAt;
            const ttl = getGuestTTL(isGuest);

            // First get existing meta to update it
            const existingMeta = await redis.get<string>(metaKey);
            if (!existingMeta) {
                return false;
            }

            const meta = deserializeMeta(existingMeta);
            if (!meta) {
                return false;
            }

            // Update metadata with new version info
            const updatedMeta: CachedDocumentMeta = {
                ...meta,
                title: version.title,
                updatedAt: version.updatedAt, // Unix timestamp
            };

            const result = await redis.eval(
                APPEND_VERSION_SCRIPT,
                [metaKey, versionsKey],
                [
                    serializeMeta(updatedMeta),
                    serializeVersion(version),
                    score.toString(),
                    ttl.toString(),
                ]
            );

            // Update score in user's document list with atomic TTL
            const pipeline = redis.pipeline();
            pipeline.zadd(userDocsKey, { score, member: documentId });
            if (ttl > 0) {
                pipeline.expire(userDocsKey, ttl);
            }
            await pipeline.exec();

            return typeof result === "number" && result >= 1;
        },
        false
    );
}

/**
 * Fork document (copy versions up to timestamp)
 *
 * Uses FORK_DOCUMENT_SCRIPT for atomic operation.
 *
 * @param sourceUserId - Source user identifier
 * @param sourceDocId - Source document identifier
 * @param targetUserId - Target user identifier
 * @param targetDocId - Target document identifier
 * @param untilTimestamp - Copy versions up to this timestamp
 * @param isGuest - Whether target user is a guest (affects TTL)
 * @returns true if successful, false otherwise
 */
export async function forkDocumentInCache(
    sourceUserId: string,
    sourceDocId: string,
    targetUserId: string,
    targetDocId: string,
    untilTimestamp: number,
    isGuest: boolean
): Promise<boolean> {
    return withCircuitBreaker(
        "forkDocumentInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const srcMetaKey = CacheKeys.documentMeta(sourceUserId, sourceDocId);
            const srcVersionsKey = CacheKeys.documentVersions(
                sourceUserId,
                sourceDocId
            );
            const dstMetaKey = CacheKeys.documentMeta(targetUserId, targetDocId);
            const dstVersionsKey = CacheKeys.documentVersions(
                targetUserId,
                targetDocId
            );
            const userDocsKey = CacheKeys.userDocuments(targetUserId);
            const ttl = getGuestTTL(isGuest);

            // Get source metadata
            const srcMeta = await redis.get<string>(srcMetaKey);
            if (!srcMeta) {
                return false;
            }

            const sourceMeta = deserializeMeta(srcMeta);
            if (!sourceMeta) {
                return false;
            }

            // Create new metadata for forked document
            const now = Date.now();
            const newMeta: CachedDocumentMeta = {
                ...sourceMeta,
                id: targetDocId,
                userId: targetUserId,
                createdAt: now, // Unix timestamp (milliseconds)
                updatedAt: now, // Unix timestamp (milliseconds)
            };

            // Set new metadata
            await redis.set(dstMetaKey, serializeMeta(newMeta));
            if (ttl > 0) {
                await redis.expire(dstMetaKey, ttl);
            }

            // Fork versions using script
            const result = await redis.eval(
                FORK_DOCUMENT_SCRIPT,
                [srcVersionsKey, dstVersionsKey],
                [untilTimestamp.toString(), ttl.toString()]
            );

            // Add to target user's document list
            await redis.zadd(userDocsKey, {
                score: untilTimestamp,
                member: targetDocId,
            });
            if (ttl > 0) {
                await redis.expire(userDocsKey, ttl);
            }

            return typeof result === "number" && result >= 0;
        },
        false
    );
}

/**
 * Prune old versions (keep last N)
 *
 * Uses PRUNE_VERSIONS_SCRIPT for atomic operation.
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @param keepCount - Number of versions to keep (default: 10)
 * @returns Number of versions removed
 */
export async function pruneVersionsInCache(
    userId: string,
    documentId: string,
    keepCount: number = 10
): Promise<number> {
    return withCircuitBreaker(
        "pruneVersionsInCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return 0;
            }

            const versionsKey = CacheKeys.documentVersions(userId, documentId);

            const result = await redis.eval(
                PRUNE_VERSIONS_SCRIPT,
                [versionsKey],
                [keepCount.toString()]
            );

            return typeof result === "number" ? result : 0;
        },
        0
    );
}

/**
 * Delete document from cache
 *
 * Removes metadata, all versions, and entry from user's document list.
 *
 * @param userId - User identifier
 * @param documentId - Document identifier
 * @returns true if deleted, false otherwise
 */
export async function deleteDocumentFromCache(
    userId: string,
    documentId: string
): Promise<boolean> {
    return withCircuitBreaker(
        "deleteDocumentFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return false;
            }

            const metaKey = CacheKeys.documentMeta(userId, documentId);
            const versionsKey = CacheKeys.documentVersions(userId, documentId);
            const userDocsKey = CacheKeys.userDocuments(userId);

            // Pipeline: DEL meta + versions, ZREM from user list
            const pipeline = redis.pipeline();
            pipeline.del(metaKey);
            pipeline.del(versionsKey);
            pipeline.zrem(userDocsKey, documentId);

            const results = await pipeline.exec();

            if (!results || results.length !== 3) {
                return false;
            }

            // At least one key was deleted
            const [metaDeleted, versionsDeleted] = results;
            return (
                (typeof metaDeleted === "number" && metaDeleted > 0) ||
                (typeof versionsDeleted === "number" && versionsDeleted > 0)
            );
        },
        false
    );
}

/**
 * Get user's document list
 *
 * Uses ZREVRANGE for descending order (most recent first).
 *
 * @param userId - User identifier
 * @param options - Pagination options
 * @returns Array of document IDs with updatedAt timestamps, or null if not in cache
 */
interface ZRangeWithScoreResult {
    value: string;
    score: number;
}

export async function getUserDocumentsFromCache(
    userId: string,
    options?: { limit?: number; offset?: number }
): Promise<{ documentId: string; updatedAt: number }[] | null> {
    return withCircuitBreaker(
        "getUserDocumentsFromCache",
        async () => {
            const redis = getRedis();
            if (!redis) {
                return null;
            }

            const userDocsKey = CacheKeys.userDocuments(userId);
            const offset = options?.offset ?? 0;
            const limit = options?.limit ?? 50;

            // ZREVRANGE with WITHSCORES for descending order
            // Upstash returns array of { value, score } objects when withScores: true
            const results = await redis.zrange<ZRangeWithScoreResult[]>(
                userDocsKey,
                offset,
                offset + limit - 1,
                { rev: true, withScores: true }
            );

            if (!results || results.length === 0) {
                return null;
            }

            // Upstash withScores returns [{ value: string, score: number }, ...]
            return results.map((item) => ({
                documentId: item.value,
                updatedAt: item.score,
            }));
        },
        null
    );
}
