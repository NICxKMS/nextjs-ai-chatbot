import type { ArtifactKind } from "@/lib/artifacts/types";
import {
    requireAuthForRoute,
    requireRateLimitForRoute,
    requireResourceForRoute,
    verifyOwnershipForRoute,
} from "@/lib/api/guards";

import { getSearchParams } from "@/lib/api/utils";

import {
    parseJsonBodyForRoute,
    parseTimestampForRoute,
    requireQueryParamForRoute,
    validateUUIDForRoute,
} from "@/lib/api/validators";
import { documentData } from "@/lib/data/document";
import { ChatSDKError } from "@/lib/errors";
import { documentPostSchema } from "./schema";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function GET(request: Request) {
    const searchParams = getSearchParams(request);

    // Require and validate id parameter
    const idResult = requireQueryParamForRoute(searchParams, "id");
    if (idResult instanceof Response) {
        return idResult;
    }
    const id = idResult;

    const uuidCheck = validateUUIDForRoute(id, "id");
    if (uuidCheck) {
        return uuidCheck;
    }

    // Require authenticated session
    const authResult = await requireAuthForRoute("document");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply rate limiting for document reads
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "document"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    const documents = await documentData.getAll(id, ctx);

    const [document] = documents;

    // Require document exists
    const docResource = requireResourceForRoute(document, "document");
    if (docResource instanceof Response) {
        return docResource;
    }

    // Verify ownership
    const ownershipCheck = verifyOwnershipForRoute(
        docResource,
        session,
        "document"
    );
    if (ownershipCheck) {
        return ownershipCheck;
    }

    return Response.json(documents, {
        status: 200,
        headers: {
            "Cache-Control": "private, max-age=60",
        },
    });
}

export async function POST(request: Request) {
    const searchParams = getSearchParams(request);

    // Require and validate id parameter
    const idResult = requireQueryParamForRoute(searchParams, "id");
    if (idResult instanceof Response) {
        return idResult;
    }
    const id = idResult;

    const uuidCheck = validateUUIDForRoute(id, "id");
    if (uuidCheck) {
        return uuidCheck;
    }

    // Require authenticated session
    const authResult = await requireAuthForRoute("document");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply rate limiting for document writes
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "document"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Parse and validate request body
    const bodyResult = await parseJsonBodyForRoute(
        request,
        documentPostSchema,
        "document"
    );
    if (bodyResult instanceof Response) {
        return bodyResult;
    }

    const { content, title, kind } = bodyResult;

    const documents = await documentData.getAll(id, ctx);

    let chatId: string | null = null;

    if (documents.length > 0) {
        // Get the most recent document - type assertion is safe since length > 0
        const mostRecent = documents.at(-1) as (typeof documents)[number];

        // Verify ownership
        const ownershipCheck = verifyOwnershipForRoute(
            mostRecent,
            session,
            "document"
        );
        if (ownershipCheck) {
            return ownershipCheck;
        }

        // Issue #8 Fix: Validate that kind matches the original document's kind
        // Changing document kind could cause rendering issues
        if (mostRecent.kind !== kind) {
            return new ChatSDKError(
                "bad_request:document:kind_mismatch",
                `Cannot change document kind from '${mostRecent.kind}' to '${kind}'`
            ).toResponse();
        }

        chatId = mostRecent.chatId;
    } else {
        return new ChatSDKError(
            "bad_request:document:no_chat_context",
            "Cannot save document without existing chat context"
        ).toResponse();
    }

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

export async function DELETE(request: Request) {
    const searchParams = getSearchParams(request);

    // Require and validate id parameter
    const idResult = requireQueryParamForRoute(searchParams, "id");
    if (idResult instanceof Response) {
        return idResult;
    }
    const id = idResult;

    const uuidCheck = validateUUIDForRoute(id, "id");
    if (uuidCheck) {
        return uuidCheck;
    }

    // Require timestamp parameter
    const timestampResult = requireQueryParamForRoute(
        searchParams,
        "timestamp"
    );
    if (timestampResult instanceof Response) {
        return timestampResult;
    }

    // Parse and validate timestamp
    const timestampDateResult = parseTimestampForRoute(
        timestampResult,
        "timestamp"
    );
    if (timestampDateResult instanceof Response) {
        return timestampDateResult;
    }
    const timestampDate = timestampDateResult;

    // Require authenticated session
    const authResult = await requireAuthForRoute("document");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply strict rate limiting for document deletes
    const rateLimitResult = await requireRateLimitForRoute(
        "strict",
        session.user.id,
        "document"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    const documents = await documentData.getAll(id, ctx);

    const [document] = documents;

    // Require document exists
    const docResource = requireResourceForRoute(document, "document");
    if (docResource instanceof Response) {
        return docResource;
    }

    // Verify ownership
    const ownershipCheck = verifyOwnershipForRoute(
        docResource,
        session,
        "document"
    );
    if (ownershipCheck) {
        return ownershipCheck;
    }

    const documentsDeleted = await documentData.deleteAfterTimestamp(
        id,
        timestampDate,
        ctx
    );

    return Response.json(documentsDeleted, { status: 200 });
}
