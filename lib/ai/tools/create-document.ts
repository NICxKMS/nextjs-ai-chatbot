import "server-only";

import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import {
    artifactKinds,
    documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { AppSession } from "@/lib/auth/session";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
    session: AppSession;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    chatId: string;
};

export const createDocument = ({
    session,
    dataStream,
    chatId,
}: CreateDocumentProps) =>
    tool({
        description:
            "Create a new document, code snippet, or spreadsheet. Use for substantial content (>10 lines) or when the user explicitly requests a separate artifact.",
        inputSchema: z.object({
            title: z.string(),
            kind: z.enum(artifactKinds),
        }),
        execute: async ({ title, kind }) => {
            const id = generateUUID();

            dataStream.write({
                type: "data-kind",
                data: kind,
                transient: true,
            });

            dataStream.write({
                type: "data-id",
                data: id,
                transient: true,
            });

            dataStream.write({
                type: "data-title",
                data: title,
                transient: true,
            });

            dataStream.write({
                type: "data-clear",
                data: null,
                transient: true,
            });

            const documentHandler = documentHandlersByArtifactKind.find(
                (documentHandlerByArtifactKind) =>
                    documentHandlerByArtifactKind.kind === kind
            );

            if (!documentHandler) {
                throw new ChatSDKError(
                    "bad_request:document:no_handler_for_kind",
                    `No document handler found for kind: ${kind}`
                );
            }

            await documentHandler.onCreateDocument({
                id,
                title,
                dataStream,
                session,
                chatId,
            });

            dataStream.write({
                type: "data-finish",
                data: null,
                transient: true,
            });

            return {
                id,
                title,
                kind,
                content:
                    "A document was created and is now visible to the user.",
            };
        },
    });
