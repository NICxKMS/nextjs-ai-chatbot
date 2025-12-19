import {
    requireAuthForRoute,
    requireRateLimitForRoute,
} from "@/lib/api/guards";
import { getSearchParams } from "@/lib/api/utils";
import {
    requireQueryParamForRoute,
    validateUUIDForRoute,
} from "@/lib/api/validators";
import { documentData } from "@/lib/data/document";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export const GET = async (request: Request) => {
    // 1. Authentication FIRST - verify identity before any other processing
    const authResult = await requireAuthForRoute("suggestions");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // 2. Rate limiting - prevent abuse after auth is verified
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "api"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // 3. Guest users cannot retrieve suggestions (not persisted in database)
    if (session.user.type === "guest") {
        return Response.json([], {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300",
            },
        });
    }

    // 4. Parameter validation - only after auth is confirmed
    const searchParams = getSearchParams(request);

    const documentIdResult = requireQueryParamForRoute(
        searchParams,
        "documentId"
    );
    if (documentIdResult instanceof Response) {
        return documentIdResult;
    }
    const documentId = documentIdResult;

    // 5. UUID format validation
    const uuidCheck = validateUUIDForRoute(documentId, "documentId");
    if (uuidCheck) {
        return uuidCheck;
    }

    // Issue #13 Fix: Verify document ownership before returning suggestions
    // This adds defense-in-depth by ensuring the document itself belongs to the user,
    // not just the suggestions. Uses the data layer with built-in IDOR protection.
    const document = await documentData.get(documentId, ctx);
    if (!document) {
        // Document not found or doesn't belong to user - return empty array
        // (not 404 to avoid information disclosure about document existence)
        return Response.json([], {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300",
            },
        });
    }

    // 7. Database query with IDOR protection (userId filter)
    // The query filters by userId ensuring only user's suggestions are returned
    const suggestions = await getSuggestionsByDocumentId({
        documentId,
        userId: session.user.id,
    });

    if (suggestions.length === 0) {
        return Response.json([], {
            status: 200,
            headers: {
                "Cache-Control": "private, max-age=300",
            },
        });
    }

    return Response.json(suggestions, {
        status: 200,
        headers: {
            "Cache-Control": "private, max-age=300",
        },
    });
};
