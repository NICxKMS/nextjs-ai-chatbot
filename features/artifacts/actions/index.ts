"use server";

/**
 * Artifact Server Actions
 * Ref: oldapp/artifacts/actions.ts
 *
 * Server actions for artifact operations.
 */

import { getSessionCached } from "@/lib/auth";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/documents";
import { type AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Get suggestions for a document.
 *
 * This action uses graceful degradation - returns empty array on any error
 * to avoid disrupting the user experience.
 *
 * @param params Object containing documentId
 * @returns Array of suggestion strings
 */
export async function getSuggestions({
    documentId,
}: {
    documentId: string;
}): Promise<string[]> {
    try {
        // Validate session
        const session = await getSessionCached();
        if (!session) {
            return [];
        }

        // Guest users don't have suggestions (not persisted in database)
        if (session.user.type === "guest") {
            return [];
        }

        // Validate documentId
        if (!documentId || !isValidUUID(documentId)) {
            return [];
        }

        // Create data context
        const ctx = createContext(session.user.id, session.user.type);

        // Verify the user owns the document
        const document = await documentData.get(documentId, ctx);
        if (!document) {
            return [];
        }

        // Get suggestions from database
        const suggestions = await documentData.getSuggestions(documentId, ctx);

        // Return suggestion texts
        return suggestions.map((s) => s.suggestedText);
    } catch (error) {
        // Graceful degradation: log error and return empty array
        // This prevents errors from disrupting the user experience
        if (isAppError(error)) {
            logger.warn("getSuggestions graceful degradation:", {
                code: (error as AppError).code,
                documentId,
            });
        } else {
            logger.warn("getSuggestions unexpected error:", {
                error: error instanceof Error ? error.message : "Unknown error",
                documentId,
            });
        }
        return [];
    }
}
