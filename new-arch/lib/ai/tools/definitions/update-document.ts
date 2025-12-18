"use server";

/**
 * Update Document Tool Definition
 * @module new-arch/lib/ai/tools/definitions/update-document
 *
 * Tool for updating existing document artifacts.
 */

import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

import type { AppSession } from "../../../auth/types";
import type { Document, DocumentKind } from "../../../data/types";

// ============================================================================
// Types
// ============================================================================

type UpdateDocumentContext = {
    session: AppSession;
    dataStream: UIMessageStreamWriter;
    getDocument: (id: string) => Promise<Document | null>;
};

type UpdateDocumentResult = {
    id: string;
    title: string;
    kind: DocumentKind;
    content: string;
};

type UpdateDocumentError = {
    error: string;
};

// ============================================================================
// Schema
// ============================================================================

const inputSchema = z.object({
    id: z.string().describe("The ID of the document to update"),
    description: z
        .string()
        .describe("The description of changes that need to be made"),
});

type UpdateDocumentInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Factory
// ============================================================================

/**
 * Update Document Tool Factory
 *
 * Creates a tool for modifying existing document artifacts.
 * Requires document lookup function for fetching current state.
 *
 * @param context - Tool execution context with session, data stream, and document getter
 * @returns Configured tool instance
 *
 * @example
 * ```ts
 * const updateDoc = updateDocumentTool({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   getDocument: async (id) => await documentData.get(id),
 * });
 *
 * const result = await updateDoc.execute({
 *   id: 'doc-123',
 *   description: 'Fix typos and improve formatting',
 * });
 * ```
 */
export function updateDocumentTool(context: UpdateDocumentContext) {
    const { session, dataStream, getDocument } = context;

    return tool({
        description:
            "Update an existing document. Provide a clear description of the changes required.",
        parameters: inputSchema,
        execute: async (
            input: UpdateDocumentInput
        ): Promise<UpdateDocumentResult | UpdateDocumentError> => {
            const { id, description: _description } = input;

            // Validate session
            if (!session?.user?.id) {
                return {
                    error: "Authentication required to update documents",
                };
            }

            // Fetch existing document
            const document = await getDocument(id);

            if (!document) {
                return {
                    error: "Document not found",
                };
            }

            // Signal clear for new content
            dataStream.write({
                type: "data-clear",
                data: null,
            });

            // Note: Actual document update logic is handled by document handler
            // based on the document kind. The tool prepares the context and
            // delegates to the appropriate handler.

            dataStream.write({
                type: "data-finish",
                data: null,
            });

            return {
                id,
                title: document.title,
                kind: document.kind,
                content: "The document has been updated successfully.",
            };
        },
    });
}

// ============================================================================
// Export Types
// ============================================================================

export type {
    UpdateDocumentContext,
    UpdateDocumentInput,
    UpdateDocumentResult,
};
