import "server-only";

import { and, eq } from "drizzle-orm";

import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Document, document } from "../schema";
import type { DocumentKind } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type CreateDocumentInput = {
    id?: string;
    title: string;
    content?: string | null;
    kind: DocumentKind;
    userId: string;
    chatId: string;
};

export type UpdateDocumentInput = {
    id: string;
    createdAt: Date;
    title?: string;
    content?: string | null;
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new document (creates a new version)
 *
 * @param input - Document creation data
 * @returns The created document
 */
export async function createDocument(
    input: CreateDocumentInput
): Promise<Document> {
    const { id, title, content, kind, userId, chatId } = input;

    try {
        const [result] = await db
            .insert(document)
            .values({
                ...(id !== undefined && { id }),
                title,
                content: content ?? null,
                kind,
                userId,
                chatId,
            })
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to create document - no result returned",
                context: { title, kind, chatId },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create document",
            context: { title, kind, chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Update an existing document version
 *
 * Note: Documents use composite primary key (id, createdAt),
 * so both are required to identify a specific version.
 *
 * @param input - Document update data with id and createdAt
 * @returns The updated document
 */
export async function updateDocument(
    input: UpdateDocumentInput
): Promise<Document> {
    const { id, createdAt, title, content } = input;

    try {
        const updates: Partial<Document> = {
            updatedAt: new Date(),
        };

        if (title !== undefined) {
            updates.title = title;
        }
        if (content !== undefined) {
            updates.content = content;
        }

        const [result] = await db
            .update(document)
            .set(updates)
            .where(and(eq(document.id, id), eq(document.createdAt, createdAt)))
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.NOT_FOUND, {
                message: "Document not found",
                context: { documentId: id, createdAt: createdAt.toISOString() },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to update document",
            context: { documentId: id },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete a specific document version
 *
 * @param documentId - The document UUID
 * @param createdAt - The creation timestamp of the version to delete
 * @returns True if deleted, false if not found
 */
export async function deleteDocument(
    documentId: string,
    createdAt: Date
): Promise<boolean> {
    try {
        const result = await db
            .delete(document)
            .where(
                and(
                    eq(document.id, documentId),
                    eq(document.createdAt, createdAt)
                )
            )
            .returning({ id: document.id });

        return result.length > 0;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete document",
            context: { documentId, createdAt: createdAt.toISOString() },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
