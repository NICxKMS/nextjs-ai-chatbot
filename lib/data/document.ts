import "server-only";

import type { ArtifactKind } from "@/lib/artifacts/types";
import { logError } from "@/lib/log";
import {
    appendDocumentVersionToCache,
    deleteDocumentVersionsFromCacheAfterTimestamp,
    getDocumentFromCache,
    warmDocumentCache,
} from "../cache/operations";
import { isRedisAvailable } from "../cache/redis";
import type { Document, Suggestion } from "../db/schema";
import { ChatSDKError, toDatabaseError } from "../errors";
import type { DataContext } from "./base";

/**
 * ==============================================================================
 * DOCUMENT DATA ACCESS LAYER
 * ==============================================================================
 *
 * Unified document operations with cache-first strategy.
 * Automatically handles guest (cache-only) vs authenticated (cache+DB) flows.
 *
 * Key principles:
 * - Cache checked FIRST for all operations (guest and auth)
 * - Cache miss for guests → return null/empty (no DB call, no empty cache write)
 * - Cache miss for auth → single DB query, warm cache in background
 * - Write operations: cache always updated, DB write only for auth users
 * - Documents support versioning (multiple versions per document ID)
 */

/**
 * Helper to load DB modules with proper error handling
 * Issue 3.2: Dynamic imports in Promise.all can have unclear errors
 */
async function loadDbModules() {
    try {
        const [dbModule, schemaModule, drizzleOps] = await Promise.all([
            import("../db/queries"),
            import("../db/schema"),
            import("drizzle-orm"),
        ]);
        return {
            db: dbModule.db,
            document: schemaModule.document,
            suggestion: schemaModule.suggestion,
            eq: drizzleOps.eq,
            asc: drizzleOps.asc,
            gt: drizzleOps.gt,
            and: drizzleOps.and,
        };
    } catch (importError) {
        throw new ChatSDKError(
            "bad_request:document",
            `Failed to load database modules: ${importError instanceof Error ? importError.message : "Unknown error"}`
        );
    }
}

/**
 * Document data access methods
 */
export const documentData = {
    /**
     * Get latest version of a document
     *
     * Flow:
     * 1. Check cache (for both guest and auth users)
     * 2. Cache hit ÔåÆ return latest version
     * 3. Cache miss + guest ÔåÆ return null (NO DB call)
     * 4. Cache miss + auth ÔåÆ query DB, warm cache in background, return
     *
     * @param documentId Document UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Latest document version or null if not found
     */
    get: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Document | null> => {
        try {
            // Task 9.10: Try cache first with error recovery
            // If cache fails, fall back to DB-only operation for auth users
            if (isRedisAvailable()) {
                try {
                    const cached = await getDocumentFromCache(
                        documentId,
                        ctx.userId
                    );
                    if (cached && cached.versions.length > 0) {
                        const latestVersion = cached.versions.at(-1);
                        if (latestVersion) {
                            // Return cached data (for both guests and authenticated users)
                            return {
                                id: cached.id,
                                userId: cached.userId,
                                chatId: cached.chatId,
                                title: latestVersion.title,
                                content: latestVersion.content,
                                kind: latestVersion.kind,
                                createdAt: new Date(latestVersion.createdAt),
                                updatedAt: new Date(latestVersion.updatedAt),
                            } as Document;
                        }
                    }
                } catch (cacheError) {
                    // Task 9.10: Log cache error and fall through to DB for auth users
                    logError(
                        "Document cache read failed, falling back to DB",
                        cacheError,
                        {
                            documentId,
                        }
                    );
                    // For guests, cache is the only source - return null
                    if (ctx.isGuest) {
                        return null;
                    }
                    // For auth users, continue to DB fallback below
                }
            }

            // Guest users: cache-only, return null if not in cache
            if (ctx.isGuest) {
                return null;
            }

            // Authenticated users: fallback to database (single query)
            // FIX IDOR: Filter by userId to prevent unauthorized access
            const { db, document, eq, asc, and } = await loadDbModules();

            const documents = await db
                .select()
                .from(document)
                .where(
                    and(
                        eq(document.id, documentId),
                        eq(document.userId, ctx.userId)
                    )
                )
                .orderBy(asc(document.createdAt));

            if (documents.length === 0) {
                return null;
            }

            // Warm cache in background using the same result set
            if (isRedisAvailable()) {
                warmDocumentCache(
                    documentId,
                    ctx.userId,
                    documents as Document[]
                ).catch((err) => logError("warmDocumentCache failed", err));
            }

            const latestDocument = documents.at(-1);
            return latestDocument ?? null;
        } catch (error) {
            throw toDatabaseError(
                "get_document_by_id",
                error,
                "Failed to get document by id"
            );
        }
    },

    /**
     * Get all versions of a document
     *
     * Flow:
     * 1. Check cache (for both guest and auth users)
     * 2. Cache hit ÔåÆ return all versions
     * 3. Cache miss + guest ÔåÆ return empty array (NO DB call)
     * 4. Cache miss + auth ÔåÆ query DB, warm cache in background, return
     *
     * @param documentId Document UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Array of document versions (chronologically ordered)
     */
    getAll: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Document[]> => {
        try {
            // Task 9.10: Try cache first with error recovery
            // If cache fails, fall back to DB-only operation for auth users
            if (isRedisAvailable()) {
                try {
                    const cached = await getDocumentFromCache(
                        documentId,
                        ctx.userId
                    );
                    if (cached && cached.versions.length > 0) {
                        // Return cached data (for both guests and authenticated users)
                        return cached.versions.map((v) => ({
                            id: cached.id,
                            userId: cached.userId,
                            chatId: cached.chatId,
                            title: v.title,
                            content: v.content,
                            kind: v.kind,
                            createdAt: new Date(v.createdAt),
                            updatedAt: new Date(v.updatedAt),
                        })) as Document[];
                    }
                } catch (cacheError) {
                    // Task 9.10: Log cache error and fall through to DB for auth users
                    logError(
                        "Document cache read failed in getAll, falling back to DB",
                        cacheError,
                        {
                            documentId,
                        }
                    );
                    // For guests, cache is the only source - return empty array
                    if (ctx.isGuest) {
                        return [];
                    }
                    // For auth users, continue to DB fallback below
                }
            }

            // Guest users: cache-only, return empty if not in cache
            if (ctx.isGuest) {
                return [];
            }

            // Authenticated users: fallback to database
            // FIX IDOR: Filter by userId to prevent unauthorized access
            const { db, document, eq, asc, and } = await loadDbModules();

            const documents = await db
                .select()
                .from(document)
                .where(
                    and(
                        eq(document.id, documentId),
                        eq(document.userId, ctx.userId)
                    )
                )
                .orderBy(asc(document.createdAt));

            // Warm cache in background
            if (isRedisAvailable() && documents.length > 0) {
                warmDocumentCache(
                    documentId,
                    ctx.userId,
                    documents as Document[]
                ).catch((err) => logError("warmDocumentCache failed", err));
            }

            return documents;
        } catch (error) {
            throw toDatabaseError(
                "get_documents_by_id",
                error,
                "Failed to get documents by id"
            );
        }
    },

    /**
     * Save a new document version
     *
     * Flow:
     * - Guest users: append to cache only
     * - Auth users: DB-first approach (write to DB, then cache)
     *
     * @param params Document save parameters
     * @param ctx Data context (userId, isGuest)
     * @returns Saved document array
     */
    save: async (
        params: {
            id: string;
            chatId: string;
            title: string;
            kind: ArtifactKind;
            content: string;
        },
        ctx: DataContext
    ): Promise<Document[]> => {
        try {
            const { id, chatId, title, kind, content } = params;
            const createdAt = new Date();

            if (ctx.isGuest) {
                // Guest users: cache-only, no database write
                if (isRedisAvailable()) {
                    await appendDocumentVersionToCache(
                        id,
                        ctx.userId,
                        {
                            title,
                            content,
                            kind,
                            createdAt: createdAt.toISOString(),
                            updatedAt: createdAt.toISOString(),
                        },
                        { chatId }
                    );
                }

                // Return mock document object for guest
                return [
                    {
                        id,
                        chatId,
                        title,
                        kind,
                        content,
                        userId: ctx.userId,
                        createdAt,
                        updatedAt: createdAt,
                    } as Document,
                ];
            }

            // Authenticated users: DB-FIRST approach to prevent cache/DB inconsistency
            // FIX Issue 2.2: Write to DB first, then cache. Errors properly propagated.
            const { db, document } = await loadDbModules();

            // DB first (source of truth)
            const dbResult = await db
                .insert(document)
                .values({
                    id,
                    chatId,
                    title,
                    kind,
                    content,
                    userId: ctx.userId,
                    createdAt,
                    updatedAt: createdAt,
                })
                .returning();

            // Cache update AFTER DB success (fire-and-forget)
            // If cache update fails, DB is source of truth
            if (isRedisAvailable()) {
                appendDocumentVersionToCache(
                    id,
                    ctx.userId,
                    {
                        title,
                        content,
                        kind,
                        createdAt: createdAt.toISOString(),
                        updatedAt: createdAt.toISOString(),
                    },
                    { chatId }
                ).catch((err) =>
                    logError(
                        "Document cache update failed after DB success",
                        err
                    )
                );
            }

            return dbResult;
        } catch (error) {
            throw toDatabaseError(
                "save_document",
                error,
                "Failed to save document"
            );
        }
    },

    /**
     * Delete document versions after a specific timestamp
     * Used for document rollback
     *
     * @param documentId Document UUID
     * @param timestamp Delete versions created after this timestamp
     * @param ctx Data context (userId, isGuest)
     */
    deleteAfterTimestamp: async (
        documentId: string,
        timestamp: Date,
        ctx: DataContext
    ): Promise<Document[]> => {
        try {
            if (ctx.isGuest) {
                // Guest users: cache-only deletion, no database
                if (isRedisAvailable()) {
                    await deleteDocumentVersionsFromCacheAfterTimestamp(
                        documentId,
                        ctx.userId,
                        timestamp
                    );
                }
                // Return empty array (no DB records to return for guests)
                return [];
            }

            // Authenticated users: DB-FIRST approach to prevent cache/DB inconsistency
            // FIX IDOR: Filter by userId to prevent unauthorized deletion
            // FIX TRANSACTION: Wrap DB operations in transaction for atomicity
            const { db, document, suggestion, eq, gt, and } =
                await loadDbModules();

            // Execute DB transaction first (source of truth)
            const result = await db.transaction(async (tx) => {
                // First verify ownership by checking if any matching docs exist
                const ownedDocs = await tx
                    .select({ id: document.id })
                    .from(document)
                    .where(
                        and(
                            eq(document.id, documentId),
                            eq(document.userId, ctx.userId),
                            gt(document.createdAt, timestamp)
                        )
                    )
                    .limit(1);

                if (ownedDocs.length === 0) {
                    // No matching owned documents - return empty
                    return [];
                }

                // Delete suggestions for these document versions
                await tx
                    .delete(suggestion)
                    .where(
                        and(
                            eq(suggestion.documentId, documentId),
                            gt(suggestion.documentCreatedAt, timestamp)
                        )
                    );

                // Delete the document versions
                return await tx
                    .delete(document)
                    .where(
                        and(
                            eq(document.id, documentId),
                            eq(document.userId, ctx.userId),
                            gt(document.createdAt, timestamp)
                        )
                    )
                    .returning();
            });

            // Cache update AFTER DB success (fire-and-forget)
            // If cache fails, it will be consistent on next read
            if (isRedisAvailable()) {
                deleteDocumentVersionsFromCacheAfterTimestamp(
                    documentId,
                    ctx.userId,
                    timestamp
                ).catch((err) =>
                    logError(
                        "Document cache delete failed after DB success",
                        err
                    )
                );
            }

            return result;
        } catch (error) {
            throw toDatabaseError(
                "delete_documents_after_timestamp",
                error,
                "Failed to delete documents by id after timestamp"
            );
        }
    },

    /**
     * Get suggestions for a document
     *
     * Task 6.2: Data layer method for suggestions instead of direct DB access.
     * Suggestions are not cached (low frequency, complex structure).
     *
     * Flow:
     * - Guest users: return empty array (suggestions not persisted)
     * - Auth users: query DB with userId filter for IDOR protection
     *
     * @param documentId Document UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Array of suggestions for the document
     */
    getSuggestions: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Suggestion[]> => {
        // Guest users don't have suggestions (not persisted)
        if (ctx.isGuest) {
            return [];
        }

        try {
            const { db, eq, and } = await loadDbModules();
            const { suggestion } = await import("../db/schema");

            // SECURITY: Filter by userId to prevent unauthorized access (IDOR protection)
            return await db
                .select()
                .from(suggestion)
                .where(
                    and(
                        eq(suggestion.documentId, documentId),
                        eq(suggestion.userId, ctx.userId)
                    )
                );
        } catch (error) {
            throw toDatabaseError(
                "get_suggestions_by_document_id",
                error,
                "Failed to get suggestions by document id"
            );
        }
    },
};
