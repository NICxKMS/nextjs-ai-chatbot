"use server";

/**
 * Create Document Tool Definition
 * @module new-arch/lib/ai/tools/definitions/create-document
 *
 * Tool for creating new document artifacts.
 */

import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

import type { AppSession } from "../../../auth/types";
import type { DocumentKind } from "../../../data/types";

// ============================================================================
// Types
// ============================================================================

/** Available document kinds as array for Zod enum */
const DOCUMENT_KINDS = ["text", "code", "image", "sheet"] as const;

type CreateDocumentContext = {
    session: AppSession;
    dataStream: UIMessageStreamWriter;
    chatId: string;
};

type CreateDocumentResult = {
    id: string;
    title: string;
    kind: DocumentKind;
    content: string;
};

type CreateDocumentError = {
    error: string;
};

// ============================================================================
// Schema
// ============================================================================

const inputSchema = z.object({
    title: z.string().describe("The title of the document to create"),
    kind: z
        .enum(DOCUMENT_KINDS)
        .describe(
            "The type of document: 'text' for prose, 'code' for code snippets, 'image' for images, 'sheet' for spreadsheets"
        ),
});

type CreateDocumentInput = z.infer<typeof inputSchema>;

// ============================================================================
// UUID Generator
// ============================================================================

function generateUUID(): string {
    return crypto.randomUUID();
}

// ============================================================================
// Tool Factory
// ============================================================================

/**
 * Create Document Tool Factory
 *
 * Creates a tool for generating new document artifacts.
 * Use for substantial content (>10 lines) or when user explicitly requests
 * a separate artifact.
 *
 * @param context - Tool execution context with session and data stream
 * @returns Configured tool instance
 *
 * @example
 * ```ts
 * const createDoc = createDocumentTool({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   chatId: 'chat-123',
 * });
 *
 * const result = await createDoc.execute({
 *   title: 'My Document',
 *   kind: 'text',
 * });
 * ```
 */
export function createDocumentTool(context: CreateDocumentContext) {
    const { session, dataStream, chatId: _chatId } = context;

    return tool({
        description:
            "Create a new document, code snippet, or spreadsheet. Use for substantial content (>10 lines) or when the user explicitly requests a separate artifact.",
        parameters: inputSchema,
        execute: (
            input: CreateDocumentInput
        ): CreateDocumentResult | CreateDocumentError => {
            const { title, kind } = input;
            const id = generateUUID();

            // Validate session
            if (!session?.user?.id) {
                return {
                    error: "Authentication required to create documents",
                };
            }

            // Stream document metadata to client
            dataStream.write({
                type: "data-kind",
                data: kind,
            });

            dataStream.write({
                type: "data-id",
                data: id,
            });

            dataStream.write({
                type: "data-title",
                data: title,
            });

            dataStream.write({
                type: "data-clear",
                data: null,
            });

            // Note: Actual document persistence is handled by the document handler
            // The tool streams initial metadata; content is streamed separately

            dataStream.write({
                type: "data-finish",
                data: null,
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
}

// ============================================================================
// Export Types
// ============================================================================

export type {
    CreateDocumentContext,
    CreateDocumentInput,
    CreateDocumentResult,
};
