import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import type { AppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/document";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";

type UpdateDocumentProps = {
    session: AppSession;
    dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
    tool({
        description:
            "Update an existing document. Provide a clear description of the changes required.",
        inputSchema: z.object({
            id: z.string().describe("The ID of the document to update"),
            description: z
                .string()
                .describe("The description of changes that need to be made"),
        }),
        execute: async ({ id, description }) => {
            const ctx = createContext(session);
            const document = await documentData.get(id, ctx);

            if (!document) {
                return {
                    error: "Document not found",
                };
            }

            dataStream.write({
                type: "data-clear",
                data: null,
                transient: true,
            });

            const documentHandler = documentHandlersByArtifactKind.find(
                (documentHandlerByArtifactKind) =>
                    documentHandlerByArtifactKind.kind === document.kind
            );

            if (!documentHandler) {
                throw new ChatSDKError(
                    "bad_request:document:no_handler_for_kind",
                    `No document handler found for kind: ${document.kind}`
                );
            }

            await documentHandler.onUpdateDocument({
                document,
                description,
                dataStream,
                session,
            });

            dataStream.write({
                type: "data-finish",
                data: null,
                transient: true,
            });

            return {
                id,
                title: document.title,
                kind: document.kind,
                content: "The document has been updated successfully.",
            };
        },
    });
