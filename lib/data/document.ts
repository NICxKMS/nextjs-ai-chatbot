import "server-only";

import type { ArtifactKind } from "@/components/artifact";
import { logError } from "@/lib/log";
import {
	appendDocumentVersionToCache,
	deleteDocumentVersionsFromCacheAfterTimestamp,
	getDocumentFromCache,
	setDocumentInCache,
	warmDocumentCache,
} from "../cache/operations";
import { isRedisAvailable } from "../cache/redis";
import type { Document } from "../db/schema";
import { toDatabaseError } from "../errors";
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
 * Document data access methods
 */
export const documentData = {
	/**
	 * Get latest version of a document
	 *
	 * Flow:
	 * 1. Check cache (for both guest and auth users)
	 * 2. Cache hit → return latest version
	 * 3. Cache miss + guest → return null (NO DB call)
	 * 4. Cache miss + auth → query DB, warm cache in background, return
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
			// Try cache first if Redis is available
			if (isRedisAvailable()) {
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
			}

			// Guest users: cache-only, return null if not in cache
			if (ctx.isGuest) {
				return null;
			}

			// Authenticated users: fallback to database
			const { db } = await import("../db/queries");
			const { document } = await import("../db/schema");
			const { eq, desc, asc } = await import("drizzle-orm");

			const [selectedDocument] = await db
				.select()
				.from(document)
				.where(eq(document.id, documentId))
				.orderBy(desc(document.createdAt));

			if (!selectedDocument) {
				return null;
			}

			// Warm cache in background
			if (isRedisAvailable()) {
				db.select()
					.from(document)
					.where(eq(document.id, documentId))
					.orderBy(asc(document.createdAt))
					.then((docs) =>
						warmDocumentCache(documentId, ctx.userId, docs as any)
					)
					.catch((err) => logError("warmDocumentCache failed", err));
			}

			return selectedDocument;
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
	 * 2. Cache hit → return all versions
	 * 3. Cache miss + guest → return empty array (NO DB call)
	 * 4. Cache miss + auth → query DB, warm cache in background, return
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
			// Try cache first if Redis is available
			if (isRedisAvailable()) {
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
			}

			// Guest users: cache-only, return empty if not in cache
			if (ctx.isGuest) {
				return [];
			}

			// Authenticated users: fallback to database
			const { db } = await import("../db/queries");
			const { document } = await import("../db/schema");
			const { eq, asc } = await import("drizzle-orm");

			const documents = await db
				.select()
				.from(document)
				.where(eq(document.id, documentId))
				.orderBy(asc(document.createdAt));

			// Warm cache in background
			if (isRedisAvailable() && documents.length > 0) {
				warmDocumentCache(
					documentId,
					ctx.userId,
					documents as any
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
	 * - Auth users: write to DB + update cache in parallel
	 *
	 * @param params Document save parameters
	 * @param ctx Data context (userId, isGuest)
	 * @returns Saved document (or undefined for guests with DB failures)
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
	): Promise<Document[] | undefined> => {
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

			// Authenticated users: save to both DB and cache
			const { db } = await import("../db/queries");
			const { document } = await import("../db/schema");
			const { logWarn } = await import("../log");

			const dbPromise = db
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

			// Update cache in parallel
			const cachePromise = isRedisAvailable()
				? appendDocumentVersionToCache(
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
					)
				: Promise.resolve();

			const [dbResult] = await Promise.allSettled([
				dbPromise,
				cachePromise,
			]);

			if (dbResult.status === "rejected") {
				logWarn(
					"saveDocument: DB write failed, cache updated",
					dbResult.reason
				);
				// Graceful degradation: return undefined to avoid tool failure
				return undefined as any;
			}

			return dbResult.value;
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

			// Authenticated users: delete from both DB and cache in parallel
			const { db } = await import("../db/queries");
			const { document, suggestion } = await import("../db/schema");
			const { eq, gt, and } = await import("drizzle-orm");

			// Run DB and cache deletes in parallel
			const dbPromise = (async () => {
				await db
					.delete(suggestion)
					.where(
						and(
							eq(suggestion.documentId, documentId),
							gt(suggestion.documentCreatedAt, timestamp)
						)
					);

				return await db
					.delete(document)
					.where(
						and(
							eq(document.id, documentId),
							gt(document.createdAt, timestamp)
						)
					)
					.returning();
			})();

			const cachePromise = isRedisAvailable()
				? deleteDocumentVersionsFromCacheAfterTimestamp(
						documentId,
						ctx.userId,
						timestamp
					)
				: Promise.resolve();

			const [result] = await Promise.all([dbPromise, cachePromise]);
			return result;
		} catch (error) {
			throw toDatabaseError(
				"delete_documents_after_timestamp",
				error,
				"Failed to delete documents by id after timestamp"
			);
		}
	},
};
