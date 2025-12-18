import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Document, document } from "../schema";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a document by its ID (returns latest version)
 *
 * @param documentId - The document UUID
 * @returns The document or null if not found
 */
export async function getDocumentById(
    documentId: string
): Promise<Document | null> {
    try {
        const [result] = await db
            .select()
            .from(document)
            .where(eq(document.id, documentId))
            .orderBy(desc(document.createdAt))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch document",
            context: { documentId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get all documents for a chat
 *
 * @param chatId - The chat UUID
 * @returns Array of documents (latest version of each)
 */
export async function getDocumentsByChatId(
    chatId: string
): Promise<Document[]> {
    try {
        // Get all documents for the chat, ordered by creation time
        // Note: This returns all versions; caller should dedupe by id if needed
        return await db
            .select()
            .from(document)
            .where(eq(document.chatId, chatId))
            .orderBy(asc(document.createdAt));
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch documents for chat",
            context: { chatId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get all versions of a document
 *
 * @param documentId - The document UUID
 * @returns Array of document versions, ordered by creation time (oldest first)
 */
export async function getDocumentVersions(
    documentId: string
): Promise<Document[]> {
    try {
        return await db
            .select()
            .from(document)
            .where(eq(document.id, documentId))
            .orderBy(asc(document.createdAt));
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch document versions",
            context: { documentId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
