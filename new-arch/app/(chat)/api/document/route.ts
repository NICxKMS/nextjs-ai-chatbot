/**
 * Document Route
 * @module new-arch/app/(chat)/api/document/route
 *
 * API routes for document operations.
 */

import { z } from "zod";
import {
    badRequest,
    created,
    createRouteHandler,
    forbidden,
    json,
    notFound,
} from "@/lib/api";
import { createDocument } from "@/lib/data/document/mutations";
import {
    getDocumentById,
    getDocumentVersions,
} from "@/lib/data/document/queries";

// ============================================================================
// Schemas
// ============================================================================

const getDocumentQuerySchema = z.object({
    id: z.string().uuid(),
});

const createDocumentBodySchema = z.object({
    id: z.string().uuid(),
    chatId: z.string().uuid(),
    title: z.string().min(1).max(200),
    content: z.string().optional().default(""),
    kind: z.enum(["text", "code", "image", "sheet"]).default("text"),
});

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * GET /api/document
 *
 * Get a document by ID.
 */
export const GET = createRouteHandler(
    {
        surface: "document",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        querySchema: getDocumentQuerySchema,
        cachePolicy: "private-short",
    },
    async ({ session, query }) => {
        const documents = await getDocumentVersions(query.id);

        if (documents.length === 0) {
            return notFound("Document not found");
        }

        const [document] = documents;
        if (!document) {
            return notFound("Document not found");
        }

        if (!session?.user?.id || document.userId !== session.user.id) {
            return forbidden("Access denied");
        }

        return json(documents);
    }
);

/**
 * POST /api/document
 *
 * Create or update a document.
 */
export const POST = createRouteHandler(
    {
        surface: "document",
        method: "POST",
        auth: "required",
        rateLimit: "standard",
        guestAllowed: false,
        bodySchema: createDocumentBodySchema,
    },
    async ({ session, body, searchParams }) => {
        const documentId = searchParams.get("id") ?? body.id;
        if (!session?.user?.id) {
            // This should never happen with auth: required, but satisfies TypeScript
            return new Response("Unauthorized", { status: 401 });
        }
        const userId = session.user.id;

        // Check if document exists
        const existing = await getDocumentById(documentId);

        if (existing && existing.userId !== userId) {
            return forbidden("Access denied");
        }

        if (!body.kind || !body.content) {
            return badRequest("Missing required fields: kind, content");
        }

        const document = await createDocument({
            id: documentId,
            title: body.title,
            content: body.content,
            kind: body.kind,
            userId,
            chatId: body.chatId,
        });

        return created(document);
    }
);
