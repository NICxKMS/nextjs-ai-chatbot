/**
 * Document API Route
 * Ref: oldapp/app/(chat)/api/document/route.ts
 *
 * Handles document CRUD operations.
 */

import { getSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/documents";
import { AppError } from "@/lib/errors";
import type { ArtifactKind } from "@/features/artifacts/types";
import { documentPostSchema } from "./schema";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * GET /api/document?id=X
 *
 * Fetch all versions of a document by ID.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // Validate id parameter
    if (!id) {
        return new AppError({
            code: "validation:missing_parameter",
            message: "Missing required parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    if (!isValidUUID(id)) {
        return new AppError({
            code: "validation:invalid_format",
            message: "Invalid UUID format for parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    // Require authenticated session
    const session = await getSession();
    if (!session) {
        return new AppError({
            code: "auth:unauthorized",
            message: "Authentication required",
            statusCode: 401,
        }).toResponse();
    }

    const ctx = createContext(session.user.id, session.user.type);

    // Get all document versions
    const documents = await documentData.getAll(id, ctx);

    if (documents.length === 0) {
        return new AppError({
            code: "resource:not_found:document",
            message: "Document not found",
            statusCode: 404,
        }).toResponse();
    }

    return Response.json(documents, {
        status: 200,
        headers: {
            "Cache-Control": "private, max-age=60",
        },
    });
}

/**
 * POST /api/document?id=X
 *
 * Create or update a document version.
 */
export async function POST(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // Validate id parameter
    if (!id) {
        return new AppError({
            code: "validation:missing_parameter",
            message: "Missing required parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    if (!isValidUUID(id)) {
        return new AppError({
            code: "validation:invalid_format",
            message: "Invalid UUID format for parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    // Require authenticated session
    const session = await getSession();
    if (!session) {
        return new AppError({
            code: "auth:unauthorized",
            message: "Authentication required",
            statusCode: 401,
        }).toResponse();
    }

    const ctx = createContext(session.user.id, session.user.type);

    // Parse and validate request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new AppError({
            code: "validation:invalid_body",
            message: "Invalid JSON body",
            statusCode: 400,
        }).toResponse();
    }

    const parseResult = documentPostSchema.safeParse(body);
    if (!parseResult.success) {
        return new AppError({
            code: "validation:invalid_input",
            message:
                parseResult.error.errors[0]?.message ?? "Invalid request body",
            statusCode: 400,
        }).toResponse();
    }

    const { content, title, kind } = parseResult.data;

    // Get existing document versions
    const documents = await documentData.getAll(id, ctx);

    let chatId: string | null = null;

    if (documents.length > 0) {
        const mostRecent = documents.at(-1)!;

        // Validate that kind matches the original document's kind
        if (mostRecent.kind !== kind) {
            return new AppError({
                code: "validation:kind_mismatch",
                message: `Cannot change document kind from '${mostRecent.kind}' to '${kind}'`,
                statusCode: 400,
            }).toResponse();
        }

        chatId = mostRecent.chatId;
    } else {
        return new AppError({
            code: "validation:no_chat_context",
            message: "Cannot save document without existing chat context",
            statusCode: 400,
        }).toResponse();
    }

    if (!chatId) {
        return new AppError({
            code: "validation:no_chat_context",
            message: "Cannot save document without existing chat context",
            statusCode: 400,
        }).toResponse();
    }

    // Save document
    const document = await documentData.save(
        {
            id,
            content,
            title,
            kind: kind as ArtifactKind,
            chatId,
        },
        ctx
    );

    return Response.json(document, { status: 200 });
}

/**
 * DELETE /api/document?id=X&timestamp=Y
 *
 * Delete document versions after a specific timestamp.
 */
export async function DELETE(request: Request) {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const timestamp = url.searchParams.get("timestamp");

    // Validate id parameter
    if (!id) {
        return new AppError({
            code: "validation:missing_parameter",
            message: "Missing required parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    if (!isValidUUID(id)) {
        return new AppError({
            code: "validation:invalid_format",
            message: "Invalid UUID format for parameter: id",
            statusCode: 400,
        }).toResponse();
    }

    // Validate timestamp parameter
    if (!timestamp) {
        return new AppError({
            code: "validation:missing_parameter",
            message: "Missing required parameter: timestamp",
            statusCode: 400,
        }).toResponse();
    }

    const timestampDate = new Date(timestamp);
    if (isNaN(timestampDate.getTime())) {
        return new AppError({
            code: "validation:invalid_format",
            message: "Invalid timestamp format",
            statusCode: 400,
        }).toResponse();
    }

    // Require authenticated session
    const session = await getSession();
    if (!session) {
        return new AppError({
            code: "auth:unauthorized",
            message: "Authentication required",
            statusCode: 401,
        }).toResponse();
    }

    const ctx = createContext(session.user.id, session.user.type);

    // Verify document exists and user owns it
    const documents = await documentData.getAll(id, ctx);

    if (documents.length === 0) {
        return new AppError({
            code: "resource:not_found:document",
            message: "Document not found",
            statusCode: 404,
        }).toResponse();
    }

    // Delete document versions after timestamp
    const deletedDocuments = await documentData.deleteAfterTimestamp(
        id,
        timestampDate,
        ctx
    );

    return Response.json(deletedDocuments, { status: 200 });
}
