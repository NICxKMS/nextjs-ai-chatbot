/**
 * Suggestions API Route
 * Ref: GET suggestions for a document
 *
 * @module app/api/suggestions/route
 */

import { z } from "zod";
import { isAuthResponse, requireAuthForRoute } from "@/lib/auth";
import { documentData } from "@/lib/data/documents";
import { validationError } from "@/lib/errors";

export const maxDuration = 10;

/**
 * GET /api/suggestions - Get suggestions for a document
 */
export async function GET(request: Request): Promise<Response> {
    // 1. Authentication
    const authResult = await requireAuthForRoute("api");
    if (isAuthResponse(authResult)) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // 2. Guest users: return empty (no persistence)
    if (session.user.type === "guest") {
        return Response.json([], {
            status: 200,
            headers: { "Cache-Control": "private, max-age=300" },
        });
    }

    // 3. Extract and validate documentId query param
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
        return validationError(
            "documentId query parameter is required"
        ).toResponse();
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid("Invalid documentId format");
    const parseResult = uuidSchema.safeParse(documentId);
    if (!parseResult.success) {
        return validationError("Invalid documentId format").toResponse();
    }

    // 4. Verify document exists and belongs to user (IDOR protection)
    const doc = await documentData.get(documentId, ctx);
    if (!doc) {
        // Return empty array to avoid information disclosure
        return Response.json([], {
            status: 200,
            headers: { "Cache-Control": "private, max-age=300" },
        });
    }

    // 5. Get suggestions for document
    const suggestions = await documentData.getSuggestions(documentId, ctx);

    return Response.json(suggestions, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=300" },
    });
}
