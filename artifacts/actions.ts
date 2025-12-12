"use server";

import { requireAuth, requireRateLimit } from "@/lib/api/guards";
import { validateUUID } from "@/lib/api/validators";
import { documentData } from "@/lib/data/document";
import { ChatSDKError } from "@/lib/errors";
import { logWarn } from "@/lib/log";

/**
 * Get suggestions for a document.
 * This action uses graceful degradation - returns empty array on any error
 * to avoid disrupting the user experience.
 *
 * SECURITY FIXES APPLIED:
 * - Task 6.1: Uses standardized requireAuth/requireRateLimit guards
 * - Task 6.2: Uses documentData.getSuggestions() instead of direct DB import
 * - Task 6.3: Guest check moved before rate limiting to avoid waste
 * - Task 6.4: Static import instead of dynamic import
 * - Task 6.8: Added try-catch with logging for database errors
 */
export async function getSuggestions({ documentId }: { documentId: string }) {
    try {
        // Validate session using standardized guard (Task 6.1)
        const { session, ctx } = await requireAuth("suggestions");

        // Task 6.3: Check guest status BEFORE rate limiting to avoid waste
        // Guest users don't have suggestions (not persisted in database)
        if (session.user.type === "guest") {
            return [];
        }

        // Apply rate limiting using standardized guard (Task 6.1)
        await requireRateLimit("standard", session.user.id, "suggestions");

        // Validate documentId using standardized validator
        validateUUID(documentId, "documentId", "suggestions");

        // Verify the user owns the document
        const document = await documentData.get(documentId, ctx);
        if (!document) {
            return [];
        }

        if (document.userId !== session.user.id) {
            return [];
        }

        // Task 6.2: Use data layer method instead of direct DB import
        // Task 6.8: Error handling is done in the outer try-catch
        const suggestions = await documentData.getSuggestions(documentId, ctx);
        return suggestions ?? [];
    } catch (error) {
        // Graceful degradation: log error and return empty array
        // This prevents errors from disrupting the user experience
        if (error instanceof ChatSDKError) {
            // Expected errors (auth, rate limit, validation) - just degrade gracefully
            logWarn("getSuggestions graceful degradation", {
                code: error.code,
                documentId,
            });
        } else {
            // Unexpected errors - log with more detail
            logWarn("getSuggestions unexpected error", {
                error: error instanceof Error ? error.message : "Unknown error",
                documentId,
            });
        }
        return [];
    }
}
