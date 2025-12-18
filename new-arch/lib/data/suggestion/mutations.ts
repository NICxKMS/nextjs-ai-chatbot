import "server-only";

import { and, eq } from "drizzle-orm";
import { AppError, ErrorCodes } from "../../errors";
import { db } from "../db";
import { type Suggestion, suggestion } from "../schema";

// =============================================================================
// TYPES
// =============================================================================

export type CreateSuggestionInput = {
    documentId: string;
    documentCreatedAt: Date;
    originalText: string;
    suggestedText: string;
    description?: string;
    userId: string;
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new suggestion
 *
 * @param input - Suggestion creation data
 * @returns The created suggestion
 */
export async function createSuggestion(
    input: CreateSuggestionInput
): Promise<Suggestion> {
    const {
        documentId,
        documentCreatedAt,
        originalText,
        suggestedText,
        description,
        userId,
    } = input;

    try {
        const [result] = await db
            .insert(suggestion)
            .values({
                documentId,
                documentCreatedAt,
                originalText,
                suggestedText,
                description: description ?? null,
                userId,
            })
            .returning();

        if (!result) {
            throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
                message: "Failed to create suggestion - no result returned",
                context: { documentId, userId },
            });
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to create suggestion",
            context: { documentId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Batch create suggestions
 *
 * @param suggestions - Array of suggestions to create
 * @returns Array of created suggestions
 */
export async function createSuggestions(
    suggestions: CreateSuggestionInput[]
): Promise<Suggestion[]> {
    if (suggestions.length === 0) {
        return [];
    }

    try {
        const values = suggestions.map((s) => ({
            documentId: s.documentId,
            documentCreatedAt: s.documentCreatedAt,
            originalText: s.originalText,
            suggestedText: s.suggestedText,
            description: s.description ?? null,
            userId: s.userId,
        }));

        return await db.insert(suggestion).values(values).returning();
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to batch create suggestions",
            context: { count: suggestions.length },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Mark a suggestion as resolved
 *
 * @param suggestionId - The suggestion UUID
 * @param userId - The user UUID (for authorization)
 * @returns The updated suggestion or null if not found/unauthorized
 */
export async function resolveSuggestion(
    suggestionId: string,
    userId: string
): Promise<Suggestion | null> {
    try {
        const [result] = await db
            .update(suggestion)
            .set({ isResolved: true })
            .where(
                and(
                    eq(suggestion.id, suggestionId),
                    eq(suggestion.userId, userId)
                )
            )
            .returning();

        return result ?? null;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to resolve suggestion",
            context: { suggestionId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}

/**
 * Delete a suggestion
 *
 * @param suggestionId - The suggestion UUID
 * @param userId - The user UUID (for authorization)
 * @returns true if deleted, false if not found/unauthorized
 */
export async function deleteSuggestion(
    suggestionId: string,
    userId: string
): Promise<boolean> {
    try {
        const result = await db
            .delete(suggestion)
            .where(
                and(
                    eq(suggestion.id, suggestionId),
                    eq(suggestion.userId, userId)
                )
            )
            .returning({ id: suggestion.id });

        return result.length > 0;
    } catch (error) {
        throw new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Failed to delete suggestion",
            context: { suggestionId, userId },
            cause: error instanceof Error ? error : undefined,
        });
    }
}
