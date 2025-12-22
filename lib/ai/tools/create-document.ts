/**
 * Create Document AI Tool
 * Ref: 05-ai-integration-optimal-design.md
 *
 * AI tool for creating new documents/artifacts during chat.
 * Writes artifact stream parts to dataStream for client rendering.
 *
 * @module lib/ai/tools/create-document
 */

import { type LanguageModel, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

import {
    artifactKinds,
    documentHandlersByArtifactKind,
} from "@/features/artifacts/server";
import type { AppSession } from "@/lib/auth/types";
import { generateUUID } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for creating the createDocument tool.
 */
export type CreateDocumentToolProps = {
    /** Language model to use for document generation */
    model: LanguageModel;
    /** Current user session */
    session: AppSession;
    /** UI message stream writer for sending artifact data */
    dataStream: UIMessageStreamWriter;
    /** Chat ID for associating the document */
    chatId: string;
};

// =============================================================================
// TOOL
// =============================================================================

/**
 * Create the createDocument AI tool.
 *
 * This tool allows the AI to create new documents/artifacts during chat.
 * It writes artifact stream parts (id, title, kind, content, finish) to
 * the dataStream for client-side rendering.
 *
 * @param props - Tool configuration
 * @returns AI tool definition
 *
 * @example
 * ```ts
 * const tools = {
 *   createDocument: createDocument({ session, dataStream, chatId }),
 * };
 * ```
 */
export function createDocument({
    model,
    session,
    dataStream,
    chatId,
}: CreateDocumentToolProps) {
    return tool({
        description:
            "Create a new document, code snippet, or spreadsheet. Use for substantial content (>10 lines) or when the user explicitly requests a separate artifact.",
        inputSchema: z.object({
            title: z.string(),
            kind: z.enum(artifactKinds),
        }),
        execute: async ({ title, kind }) => {
            const id = generateUUID();

            try {
                // Write artifact metadata to stream (transient = ephemeral UI updates)
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

                // Find the appropriate document handler
                const documentHandler = documentHandlersByArtifactKind.find(
                    (handler) => handler.kind === kind
                );

                if (!documentHandler) {
                    // Write error to stream before throwing (transient = not persisted)
                    dataStream.write({
                        type: "data-error",
                        data: `No document handler found for kind: ${kind}`,
                        transient: true,
                    });
                    return {
                        id,
                        title,
                        kind,
                        error: `No document handler found for kind: ${kind}`,
                    };
                }

                // Execute the document handler's create callback
                await documentHandler.onCreateDocument({
                    id,
                    title,
                    dataStream,
                    session,
                    chatId,
                    model,
                });

                // Signal completion (transient = ephemeral UI signal)
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
            } catch (error) {
                // Log the error for debugging
                console.error("[createDocument] Tool execution error:", error);

                // Write error to stream to notify client (transient = not persisted)
                dataStream.write({
                    type: "data-error",
                    data:
                        error instanceof Error
                            ? error.message
                            : "Unknown error creating document",
                    transient: true,
                });

                // Return error object instead of throwing to prevent stream corruption
                return {
                    id,
                    title,
                    kind,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error creating document",
                };
            }
        },
    });
}
