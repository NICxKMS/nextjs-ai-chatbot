/**
 * Suggestions Route
 * @module new-arch/app/(chat)/api/suggestions/route
 *
 * API route for document suggestions.
 */

import { z } from "zod";
import { createRouteHandler, json } from "@/lib/api";
import { getDocumentById } from "@/lib/data/document/queries";
import { getSuggestionsByDocumentId } from "@/lib/data/suggestion/queries";

// ============================================================================
// Schemas
// ============================================================================

const suggestionsQuerySchema = z.object({
    documentId: z.string().uuid(),
});

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * GET /api/suggestions
 *
 * Get suggestions for a document.
 */
export const GET = createRouteHandler(
    {
        surface: "suggestions",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        querySchema: suggestionsQuerySchema,
        cachePolicy: "private-medium",
    },
    async ({ session, query }) => {
        // Guest users get empty suggestions
        if (session?.user.type === "guest") {
            return json([]);
        }

        // Verify document ownership
        const document = await getDocumentById(query.documentId);
        if (!document || document.userId !== session?.user.id) {
            // Return empty to avoid information disclosure
            return json([]);
        }

        // Fetch suggestions
        const suggestions = await getSuggestionsByDocumentId(
            query.documentId,
            session?.user.id
        );

        return json(suggestions);
    }
);
