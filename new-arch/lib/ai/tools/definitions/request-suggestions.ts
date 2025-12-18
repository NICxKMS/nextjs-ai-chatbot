"use server";

/**
 * Request Suggestions Tool Definition
 * @module new-arch/lib/ai/tools/definitions/request-suggestions
 *
 * Tool for generating improvement suggestions for documents.
 */

import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

import type { AppSession } from "../../../auth/types";
import type { Document, DocumentKind, Suggestion } from "../../../data/types";

// ============================================================================
// Types
// ============================================================================

type RequestSuggestionsContext = {
    session: AppSession;
    dataStream: UIMessageStreamWriter;
    getDocument: (id: string) => Promise<Document | null>;
    saveSuggestions?: (suggestions: Omit<Suggestion, "id">[]) => Promise<void>;
    languageModel: unknown; // AI model instance
};

type SuggestionItem = {
    id: string;
    documentId: string;
    originalText: string;
    suggestedText: string;
    description: string;
    isResolved: boolean;
};

type RequestSuggestionsResult = {
    id: string;
    title: string;
    kind: DocumentKind;
    message: string;
};

type RequestSuggestionsError = {
    error: string;
};

// ============================================================================
// Schema
// ============================================================================

const inputSchema = z.object({
    documentId: z
        .string()
        .describe("The ID of the document to request suggestions for"),
});

type RequestSuggestionsInput = z.infer<typeof inputSchema>;

const suggestionSchema = z.object({
    originalSentence: z.string().describe("The original sentence"),
    suggestedSentence: z.string().describe("The suggested sentence"),
    description: z.string().describe("The description of the suggestion"),
});

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
 * Request Suggestions Tool Factory
 *
 * Creates a tool for generating AI-powered improvement suggestions
 * for document content.
 *
 * @param context - Tool execution context with session, data stream, and model
 * @returns Configured tool instance
 *
 * @example
 * ```ts
 * const requestSuggestions = requestSuggestionsTool({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   getDocument: async (id) => await documentData.get(id),
 *   saveSuggestions: async (suggestions) => await db.insert(suggestions),
 *   languageModel: model,
 * });
 *
 * const result = await requestSuggestions.execute({
 *   documentId: 'doc-123',
 * });
 * ```
 */
export function requestSuggestionsTool(context: RequestSuggestionsContext) {
    const { session, dataStream, getDocument, saveSuggestions, languageModel } =
        context;

    return tool({
        description:
            "Generate suggestions to improve the current document's content.",
        parameters: inputSchema,
        execute: async (
            input: RequestSuggestionsInput
        ): Promise<RequestSuggestionsResult | RequestSuggestionsError> => {
            const { documentId } = input;

            // Validate session
            if (!session?.user?.id) {
                return {
                    error: "Authentication required to request suggestions",
                };
            }

            // Fetch document
            const document = await getDocument(documentId);

            if (!document?.content) {
                return {
                    error: "Document not found or has no content",
                };
            }

            const suggestions: SuggestionItem[] = [];

            // Stream suggestions from AI model
            const { elementStream } = streamObject({
                model: languageModel as Parameters<
                    typeof streamObject
                >[0]["model"],
                system: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Ensure suggestions are complete sentences and clearly describe the change.",
                prompt: document.content,
                output: "array",
                schema: suggestionSchema,
            });

            for await (const element of elementStream) {
                const suggestion: SuggestionItem = {
                    id: generateUUID(),
                    documentId,
                    originalText: element.originalSentence,
                    suggestedText: element.suggestedSentence,
                    description: element.description,
                    isResolved: false,
                };

                // Stream suggestion to client
                dataStream.write({
                    type: "data-suggestion",
                    data: suggestion,
                });

                suggestions.push(suggestion);
            }

            // Persist suggestions for authenticated users (not guests)
            if (
                session.user?.id &&
                session.user.type !== "guest" &&
                saveSuggestions
            ) {
                await saveSuggestions(
                    suggestions.map((s) => ({
                        documentId: s.documentId,
                        documentCreatedAt: document.createdAt,
                        originalText: s.originalText,
                        suggestedText: s.suggestedText,
                        description: s.description,
                        isResolved: s.isResolved,
                        userId: session.user.id,
                        createdAt: new Date(),
                    }))
                );
            }

            return {
                id: documentId,
                title: document.title,
                kind: document.kind,
                message: "Suggestions have been added to the document",
            };
        },
    });
}

// ============================================================================
// Export Types
// ============================================================================

export type {
    RequestSuggestionsContext,
    RequestSuggestionsInput,
    RequestSuggestionsResult,
    SuggestionItem,
};
