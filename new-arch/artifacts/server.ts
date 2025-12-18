/**
 * Artifact Server Utilities
 * @module new-arch/artifacts/server
 *
 * Server-side utilities for document handler creation and management.
 */

import type {
    ArtifactKind,
    CreateDocumentCallbackProps,
    DocumentHandler,
    DocumentHandlerConfig,
    UpdateDocumentCallbackProps,
} from "./types";

// =============================================================================
// DOCUMENT HANDLER FACTORY
// =============================================================================

/**
 * Creates a document handler with automatic persistence.
 *
 * @param config - Handler configuration
 * @returns Document handler instance
 *
 * @example
 * ```ts
 * const handler = createDocumentHandler({
 *   kind: 'code',
 *   onCreateDocument: async ({ title, dataStream }) => {
 *     // Stream content generation
 *     return generatedContent;
 *   },
 *   onUpdateDocument: async ({ document, description, dataStream }) => {
 *     // Stream content update
 *     return updatedContent;
 *   },
 * });
 * ```
 */
export function createDocumentHandler<T extends ArtifactKind>(
    config: DocumentHandlerConfig<T>
): DocumentHandler<T> {
    return {
        kind: config.kind,
        onCreateDocument: async (args: CreateDocumentCallbackProps) => {
            const _draftContent = await config.onCreateDocument({
                id: args.id,
                title: args.title,
                dataStream: args.dataStream,
                session: args.session,
                chatId: args.chatId,
            });

            // Document persistence is handled by the caller
            // This keeps the handler focused on content generation
            return;
        },
        onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
            const _draftContent = await config.onUpdateDocument({
                document: args.document,
                description: args.description,
                dataStream: args.dataStream,
                session: args.session,
            });

            // Document persistence is handled by the caller
            return;
        },
    };
}

// =============================================================================
// PROMPTS
// =============================================================================

/**
 * System prompt for code generation
 */
export const codePrompt = `
Generate self-contained, executable Python code.

**Requirements:**
- **Complete:** Runnable as-is.
- **Output:** Use \`print()\` to show results.
- **Concise:** Keep under 15 lines if possible.
- **Standard Lib:** No external dependencies.
- **Safe:** No \`input()\`, infinite loops, file access, or network calls.
- **Documented:** Brief comments explaining logic.
`;

/**
 * System prompt for spreadsheet generation
 */
export const sheetPrompt = `
Generate a CSV spreadsheet based on the user's request.
- Include meaningful headers.
- Ensure data is consistent and formatted correctly.
`;

/**
 * System prompt for text generation
 */
export const textPrompt = `
Write about the given topic. Markdown is supported. Use headings wherever appropriate.
`;

/**
 * Generates an update prompt for modifying existing content
 */
export function updateDocumentPrompt(
    currentContent: string | null,
    type: ArtifactKind
): string {
    const mediaType =
        type === "code"
            ? "code snippet"
            : type === "sheet"
              ? "spreadsheet"
              : type === "image"
                ? "image"
                : "document";

    return `Update the ${mediaType} below based on the user's request.
    
${currentContent ?? ""}`;
}
