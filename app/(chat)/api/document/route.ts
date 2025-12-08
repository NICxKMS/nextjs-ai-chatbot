import type { ArtifactKind } from "@/components/artifact";
import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/document";
import { ChatSDKError } from "@/lib/errors";
import { trackUserAction } from "@/lib/monitoring/dashboard";
import { withPerformanceTracking } from "@/lib/monitoring/performance";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export const GET = withPerformanceTracking(
    "GET /api/document",
    async (request: Request) => {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return new ChatSDKError(
                "bad_request:api:missing_id",
                "Parameter id is missing"
            ).toResponse();
        }

        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:document:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);
        const documents = await documentData.getAll(id, ctx);

        const [document] = documents;

        if (!document) {
            return new ChatSDKError("not_found:document").toResponse();
        }

        if (document.userId !== session.user.id) {
            return new ChatSDKError("forbidden:document").toResponse();
        }

        return Response.json(documents, { status: 200 });
    },
    {
        extractMetadata: (request) => {
            const { searchParams } = new URL(request.url);
            return { documentId: searchParams.get("id") ?? undefined };
        },
    }
);

export const POST = withPerformanceTracking(
    "POST /api/document",
    async (request: Request) => {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return new ChatSDKError(
                "bad_request:api:missing_id",
                "Parameter id is required."
            ).toResponse();
        }

        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:document:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);

        const {
            content,
            title,
            kind,
        }: { content: string; title: string; kind: ArtifactKind } =
            await request.json();

        const documents = await documentData.getAll(id, ctx);

        let chatId: string | null = null;

        if (documents.length > 0) {
            // documents.at(-1) is guaranteed to return a value when length > 0
            const mostRecent = documents.at(-1);
            if (!mostRecent) {
                return new ChatSDKError("not_found:document").toResponse();
            }

            if (mostRecent.userId !== session.user.id) {
                return new ChatSDKError("forbidden:document").toResponse();
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
                kind,
                chatId,
            },
            ctx
        );

        // Track user action for analytics
        trackUserAction("save_document", {
            documentId: id,
            userId: session.user.id,
            kind,
            chatId,
        });

        return Response.json(document, { status: 200 });
    },
    {
        extractMetadata: (request) => {
            const { searchParams } = new URL(request.url);
            return { documentId: searchParams.get("id") ?? undefined };
        },
    }
);

export const DELETE = withPerformanceTracking(
    "DELETE /api/document",
    async (request: Request) => {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const timestamp = searchParams.get("timestamp");

        if (!id) {
            return new ChatSDKError(
                "bad_request:api:missing_id",
                "Parameter id is required."
            ).toResponse();
        }

        if (!timestamp) {
            return new ChatSDKError(
                "bad_request:api:missing_timestamp",
                "Parameter timestamp is required."
            ).toResponse();
        }

        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:document:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);
        const documents = await documentData.getAll(id, ctx);

        const [document] = documents;

        if (!document) {
            return new ChatSDKError("not_found:document").toResponse();
        }

        if (document.userId !== session.user.id) {
            return new ChatSDKError("forbidden:document").toResponse();
        }

        const documentsDeleted = await documentData.deleteAfterTimestamp(
            id,
            new Date(timestamp),
            ctx
        );

        // Track user action for analytics
        trackUserAction("delete_document_versions", {
            documentId: id,
            userId: session.user.id,
            timestamp,
            deletedCount: documentsDeleted.length,
        });

        return Response.json(documentsDeleted, { status: 200 });
    },
    {
        extractMetadata: (request) => {
            const { searchParams } = new URL(request.url);
            return {
                documentId: searchParams.get("id") ?? undefined,
                timestamp: searchParams.get("timestamp") ?? undefined,
            };
        },
    }
);
