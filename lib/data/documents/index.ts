/**
 * Document Data Module
 * Ref: 03-data-layer-optimal-design.md
 *
 * Data access layer for document/artifact operations
 */
import "server-only";

import { eq, and, asc, gt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { document, suggestion } from "@/lib/db/schema";
import type { Document, Suggestion } from "@/lib/db/schema";
import type { DataContext } from "../types";
import { isGuest } from "../base";
import type { ArtifactKind } from "@/features/artifacts/types";
import { AppError } from "@/lib/errors";

/**
 * Document save parameters
 */
export interface DocumentSaveParams {
    id: string;
    chatId: string;
    title: string;
    kind: ArtifactKind;
    content: string;
}

/**
 * Document data access object
 */
export const documentData = {
    /**
     * Get latest version of a document
     */
    get: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Document | null> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return null;
        }

        const db = getDb();
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

        return documents.at(-1) ?? null;
    },

    /**
     * Get all versions of a document
     */
    getAll: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Document[]> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return [];
        }

        const db = getDb();
        return await db
            .select()
            .from(document)
            .where(
                and(
                    eq(document.id, documentId),
                    eq(document.userId, ctx.userId)
                )
            )
            .orderBy(asc(document.createdAt));
    },

    /**
     * Save a new document version
     */
    save: async (
        params: DocumentSaveParams,
        ctx: DataContext
    ): Promise<Document> => {
        const { id, chatId, title, kind, content } = params;
        const createdAt = new Date();

        // Guest users: return mock document (no DB persistence)
        if (isGuest(ctx)) {
            return {
                id,
                chatId,
                title,
                kind,
                content,
                userId: ctx.userId,
                createdAt,
            } as Document;
        }

        const db = getDb();
        const [result] = await db
            .insert(document)
            .values({
                id,
                chatId,
                title,
                kind,
                content,
                userId: ctx.userId,
                createdAt,
            })
            .returning();

        if (!result) {
            throw new AppError({
                code: "internal:database",
                message: "Failed to save document",
            });
        }

        return result;
    },

    /**
     * Delete document versions after a specific timestamp
     */
    deleteAfterTimestamp: async (
        documentId: string,
        timestamp: Date,
        ctx: DataContext
    ): Promise<Document[]> => {
        // Guest users: no persistence
        if (isGuest(ctx)) {
            return [];
        }

        const db = getDb();

        // Execute transaction for atomicity
        return await db.transaction(async (tx) => {
            // Verify ownership first
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
    },

    /**
     * Get suggestions for a document
     */
    getSuggestions: async (
        documentId: string,
        ctx: DataContext
    ): Promise<Suggestion[]> => {
        // Guest users: no suggestions
        if (isGuest(ctx)) {
            return [];
        }

        const db = getDb();
        return await db
            .select()
            .from(suggestion)
            .where(
                and(
                    eq(suggestion.documentId, documentId),
                    eq(suggestion.userId, ctx.userId)
                )
            );
    },
} as const;

/**
 * Save suggestions to database
 */
export async function saveSuggestions(
    suggestions: Suggestion[]
): Promise<void> {
    if (suggestions.length === 0) {
        return;
    }

    const db = getDb();
    await db.insert(suggestion).values(suggestions);
}

// Re-export individual functions for tree-shaking
export const getDocument = documentData.get;
export const getAllDocuments = documentData.getAll;
export const saveDocument = documentData.save;
export const deleteDocumentsAfterTimestamp = documentData.deleteAfterTimestamp;
export const getDocumentSuggestions = documentData.getSuggestions;
