/**
 * Cached Document Operations
 * Ref: 03-data-layer-optimal-design.md
 *
 * Cache-integrated document data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback, background warm
 * - WRITE: Write to DB, then update cache
 * - DELETE: Delete from DB, then delete from cache
 * - GUEST: Cache-only (no DB calls)
 */
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/tags";
import type {
    CachedDocumentMeta,
    CachedDocumentVersion,
} from "@/lib/cache/types";
import {
    appendVersionToCache,
    createDocumentInCache,
    deleteDocumentFromCache,
    getAllVersionsFromCache,
    getDocumentMetaFromCache,
    getLatestVersionFromCache,
} from "@/lib/cache-ops";
import type { Document } from "@/lib/db";
import type { ArtifactKind } from "@/lib/types";
import { isGuest } from "../base";
import {
    deleteDocumentsAfterTimestamp,
    getAllDocuments,
    getDocument,
    saveDocument,
} from "../documents";
import type { DataContext } from "../types";

/**
 * Get document with cache-first strategy
 */
export async function getDocumentCached(
    documentId: string,
    ctx: DataContext
): Promise<Document | null> {
    "use cache";
    cacheLife("documents");
    cacheTag(CacheTags.document(documentId));

    // Try cache first (get meta + latest version)
    const [cachedMeta, cachedVersion] = await Promise.all([
        getDocumentMetaFromCache(ctx.userId, documentId),
        getLatestVersionFromCache(ctx.userId, documentId),
    ]);

    if (cachedMeta && cachedVersion) {
        return cachedToDocument(cachedMeta, cachedVersion);
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return null;
    }

    // Auth = DB fallback
    const document = await getDocument(documentId, ctx);
    if (document) {
        // Background warm cache
        const { meta, version } = documentToCached(document);
        createDocumentInCache(meta, version, false).catch(() => {});
    }
    return document;
}

/**
 * Get latest document version with cache-first strategy
 */
export async function getLatestVersionCached(
    documentId: string,
    ctx: DataContext
): Promise<Document | null> {
    // Try cache first
    const [cachedMeta, cachedVersion] = await Promise.all([
        getDocumentMetaFromCache(ctx.userId, documentId),
        getLatestVersionFromCache(ctx.userId, documentId),
    ]);

    if (cachedMeta && cachedVersion) {
        return cachedToDocument(cachedMeta, cachedVersion);
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return null;
    }

    // Auth = DB fallback
    return getDocument(documentId, ctx);
}

/**
 * Get all document versions with cache-first strategy
 */
export async function getAllVersionsCached(
    documentId: string,
    ctx: DataContext
): Promise<Document[]> {
    // Try cache first
    const [cachedMeta, cachedVersions] = await Promise.all([
        getDocumentMetaFromCache(ctx.userId, documentId),
        getAllVersionsFromCache(ctx.userId, documentId),
    ]);

    if (cachedMeta && cachedVersions && cachedVersions.length > 0) {
        return cachedVersions.map((v) => cachedToDocument(cachedMeta, v));
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return [];
    }

    // Auth = DB fallback
    return getAllDocuments(documentId, ctx);
}

/**
 * Create document: Write to DB first, then cache
 */
export async function createDocumentCached(
    params: {
        id: string;
        chatId: string;
        title: string;
        kind: ArtifactKind;
        content: string;
    },
    ctx: DataContext
): Promise<Document> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only (create mock document)
    if (guestMode) {
        const now = new Date();
        const mockDoc: Document = {
            id: params.id,
            chatId: params.chatId,
            title: params.title,
            kind: params.kind,
            content: params.content,
            userId: ctx.userId,
            createdAt: now,
            updatedAt: now,
        };
        const { meta, version } = documentToCached(mockDoc);
        await createDocumentInCache(meta, version, true);
        return mockDoc;
    }

    // Auth = DB first, then cache
    const document = await saveDocument(params, ctx);
    const { meta, version } = documentToCached(document);
    await createDocumentInCache(meta, version, false).catch(() => {});
    return document;
}

/**
 * Append document version: Write to DB first, then cache
 */
export async function appendVersionCached(
    params: {
        id: string;
        chatId: string;
        title: string;
        kind: ArtifactKind;
        content: string;
    },
    ctx: DataContext
): Promise<Document> {
    const guestMode = isGuest(ctx);
    const now = new Date();

    // Guest = cache-only
    if (guestMode) {
        const mockDoc: Document = {
            id: params.id,
            chatId: params.chatId,
            title: params.title,
            kind: params.kind,
            content: params.content,
            userId: ctx.userId,
            createdAt: now,
            updatedAt: now,
        };
        const version = documentVersionToCached(mockDoc);
        await appendVersionToCache(ctx.userId, params.id, version, true);
        return mockDoc;
    }

    // Auth = DB first, then cache
    const document = await saveDocument(params, ctx);
    const version = documentVersionToCached(document);
    await appendVersionToCache(ctx.userId, params.id, version, false).catch(
        (err) => {
            // Log cache errors for observability while preventing failure
            console.warn(
                "[CachedDocuments] Failed to append version to cache:",
                err
            );
        }
    );
    return document;
}

/**
 * Delete document: Delete from DB first, then cache
 */
export async function deleteDocumentCached(
    documentId: string,
    ctx: DataContext
): Promise<boolean> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        await deleteDocumentFromCache(ctx.userId, documentId);
        return true;
    }

    // Auth = DB first, then cache
    // Delete all versions after epoch (effectively deletes all)
    const deleted = await deleteDocumentsAfterTimestamp(
        documentId,
        new Date(0),
        ctx
    );
    if (deleted.length > 0) {
        await deleteDocumentFromCache(ctx.userId, documentId).catch(() => {});
    }
    return deleted.length > 0;
}

// ============================================================================
// Helpers: Convert between DB types and Cache types
// ============================================================================

function documentToCached(doc: Document): {
    meta: CachedDocumentMeta;
    version: CachedDocumentVersion;
} {
    const createdTs = doc.createdAt.getTime();
    const updatedTs = doc.updatedAt.getTime();
    return {
        meta: {
            id: doc.id,
            userId: doc.userId,
            chatId: doc.chatId ?? "", // Cache requires non-null chatId
            title: doc.title,
            kind: doc.kind,
            createdAt: createdTs,
            updatedAt: updatedTs,
        },
        version: {
            title: doc.title,
            content: doc.content ?? "",
            kind: doc.kind,
            createdAt: createdTs,
            updatedAt: updatedTs,
        },
    };
}

function documentVersionToCached(doc: Document): CachedDocumentVersion {
    const createdTs = doc.createdAt.getTime();
    const updatedTs = doc.updatedAt.getTime();
    return {
        title: doc.title,
        content: doc.content ?? "",
        kind: doc.kind,
        createdAt: createdTs,
        updatedAt: updatedTs,
    };
}

function cachedToDocument(
    meta: CachedDocumentMeta,
    version: CachedDocumentVersion
): Document {
    return {
        id: meta.id,
        chatId: meta.chatId,
        title: version.title,
        kind: version.kind,
        content: version.content,
        userId: meta.userId,
        createdAt: new Date(version.createdAt),
        updatedAt: new Date(version.updatedAt),
    };
}
