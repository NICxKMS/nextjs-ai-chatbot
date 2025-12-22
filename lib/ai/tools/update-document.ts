/**
 * Update Document AI Tool
 * Ref: 05-ai-integration-optimal-design.md
 *
 * AI tool for updating existing documents/artifacts during chat.
 * Fetches existing document, streams update through document handler.
 *
 * @module lib/ai/tools/update-document
 */

import { type LanguageModel, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

import { documentHandlersByArtifactKind } from "@/features/artifacts/server";
import type { AppSession } from "@/lib/auth/types";
import { createContext } from "@/lib/data/base";
import { getDocumentCached } from "@/lib/data/cached";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for creating the updateDocument tool.
 */
export type UpdateDocumentToolProps = {
    /** Language model to use for document updates */
    model: LanguageModel;
    /** Current user session */
    session: AppSession;
    /** UI message stream writer for sending artifact data */
    dataStream: UIMessageStreamWriter;
};

// =============================================================================
// TOOL
// =============================================================================

/**
 * Create the updateDocument AI tool.
 *
 * This tool allows the AI to update existing documents/artifacts.
 * It fetches the document, finds the appropriate handler, and streams
 * the update to the client.
 *
 * @param props - Tool configuration
 * @returns AI tool definition
 *
 * @example
 * ```ts
 * const tools = {
 *   updateDocument: updateDocument({ session, dataStream }),
 * };
 * ```
 */
export function updateDocument({
    model,
    session,
    dataStream,
}: UpdateDocumentToolProps) {
    return tool({
        description:
            "Update an existing document. Provide a clear description of the changes required.",
        inputSchema: z.object({
            id: z.string().describe("The ID of the document to update"),
            description: z
                .string()
                .describe("The description of changes that need to be made"),
        }),
        execute: async ({ id, description }) => {
            try {
                // Create data context from session
                const ctx = createContext(session.user.id, session.user.type);

                // Fetch the existing document
                const document = await getDocumentCached(id, ctx);

                if (!document) {
                    dataStream.write({
                        type: "data-error",
                        data: "Document not found",
                        transient: true,
                    });
                    return {
                        error: "Document not found",
                    };
                }

                // Clear existing content before streaming update (transient = ephemeral UI signal)
                dataStream.write({
                    type: "data-clear",
                    data: null,
                    transient: true,
                });

                // Find the appropriate document handler
                const documentHandler = documentHandlersByArtifactKind.find(
                    (handler) => handler.kind === document.kind
                );

                if (!documentHandler) {
                    // Write error to stream before returning (transient = not persisted)
                    dataStream.write({
                        type: "data-error",
                        data: `No document handler found for kind: ${document.kind}`,
                        transient: true,
                    });
                    return {
                        id,
                        title: document.title,
                        kind: document.kind,
                        error: `No document handler found for kind: ${document.kind}`,
                    };
                }

                // Execute the document handler's update callback
                await documentHandler.onUpdateDocument({
                    document,
                    description,
                    dataStream,
                    session,
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
                    title: document.title,
                    kind: document.kind,
                    content: "The document has been updated successfully.",
                };
            } catch (error) {
                // Log the error for debugging
                console.error("[updateDocument] Tool execution error:", error);
                
                // Write error to stream to notify client (transient = not persisted)
                dataStream.write({
                    type: "data-error",
                    data: error instanceof Error ? error.message : "Unknown error updating document",
                    transient: true,
                });
                
                // Return error object instead of throwing to prevent stream corruption
                return {
                    id,
                    error: error instanceof Error ? error.message : "Unknown error updating document",
                };
            }
        },
    });
}
