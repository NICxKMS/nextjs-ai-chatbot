import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Suggestion, suggestion } from "../schema";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get suggestions for a document
 *
 * SECURITY: Always filter by userId to prevent unauthorized access (IDOR protection)
 *
 * @param documentId - The document UUID
 * @param userId - The user UUID (for authorization)
 * @returns Array of suggestions
 */
export async function getSuggestionsByDocumentId(
    documentId: string,
    userId: string
): Promise<Suggestion[]> {
    try {
        return await db
            .select()
            .from(suggestion)
            .where(
                and(
                    eq(suggestion.documentId, documentId),
                    eq(suggestion.userId, userId)
                )
            );
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch suggestions for document",
            context: { documentId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Get a single suggestion by ID
 *
 * @param suggestionId - The suggestion UUID
 * @returns The suggestion or null if not found
 */
export async function getSuggestionById(
    suggestionId: string
): Promise<Suggestion | null> {
    try {
        const [result] = await db
            .select()
            .from(suggestion)
            .where(eq(suggestion.id, suggestionId))
            .limit(1);

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to fetch suggestion",
            context: { suggestionId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
