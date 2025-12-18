"use server";

/**
 * Tool Definitions Index
 * @module new-arch/lib/ai/tools/definitions
 *
 * Barrel export for all AI tool definitions.
 *
 * @example
 * ```ts
 * import {
 *   getWeather,
 *   createDocumentTool,
 *   updateDocumentTool,
 *   requestSuggestionsTool,
 *   searchWeb,
 * } from '@/lib/ai/tools/definitions';
 *
 * // Stateless tool (no context needed)
 * const weatherResult = await getWeather.execute({ city: 'London' });
 *
 * // Contextual tool (requires session/stream)
 * const createDoc = createDocumentTool({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   chatId: 'chat-123',
 * });
 * const docResult = await createDoc.execute({ title: 'My Doc', kind: 'text' });
 * ```
 */

// ============================================================================
// Stateless Tools (no context required)
// ============================================================================

export { createGetWeatherTool, getWeather } from "./get-weather";

export { createSearchWebTool, searchWeb } from "./search-web";

// ============================================================================
// Contextual Tools (require session/stream injection)
// ============================================================================

export type {
    CreateDocumentContext,
    CreateDocumentInput,
    CreateDocumentResult,
} from "./create-document";
export { createDocumentTool } from "./create-document";
export type {
    RequestSuggestionsContext,
    RequestSuggestionsInput,
    RequestSuggestionsResult,
    SuggestionItem,
} from "./request-suggestions";
export { requestSuggestionsTool } from "./request-suggestions";
export type {
    UpdateDocumentContext,
    UpdateDocumentInput,
    UpdateDocumentResult,
} from "./update-document";
export { updateDocumentTool } from "./update-document";

// ============================================================================
// Search Types
// ============================================================================

export type {
    SearchResult,
    SearchWebContext,
    SearchWebInput,
    SearchWebResult,
} from "./search-web";

// ============================================================================
// Tool Assembly Helper
// ============================================================================

import type { UIMessageStreamWriter } from "ai";
import type { AppSession } from "../../../auth/types";
import type { Document } from "../../../data/types";
import { createDocumentTool } from "./create-document";
import { getWeather } from "./get-weather";
import { requestSuggestionsTool } from "./request-suggestions";
import { searchWeb } from "./search-web";
import { updateDocumentTool } from "./update-document";

type AssembleToolsContext = {
    session: AppSession;
    dataStream: UIMessageStreamWriter;
    chatId: string;
    getDocument: (id: string) => Promise<Document | null>;
    saveSuggestions?: (suggestions: unknown[]) => Promise<void>;
    languageModel?: unknown;
};

/**
 * Assemble all tools with shared context
 *
 * Convenience function for creating a complete tool set with
 * injected dependencies.
 *
 * @param context - Shared context for all contextual tools
 * @returns Object containing all configured tools
 *
 * @example
 * ```ts
 * const tools = assembleTools({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   chatId: 'chat-123',
 *   getDocument: async (id) => await documentData.get(id),
 * });
 *
 * // Use with AI SDK
 * const result = await generateText({
 *   model,
 *   messages,
 *   tools: {
 *     getWeather: tools.getWeather,
 *     createDocument: tools.createDocument,
 *     updateDocument: tools.updateDocument,
 *     requestSuggestions: tools.requestSuggestions,
 *     searchWeb: tools.searchWeb,
 *   },
 * });
 * ```
 */
export function assembleTools(context: AssembleToolsContext) {
    const {
        session,
        dataStream,
        chatId,
        getDocument,
        saveSuggestions,
        languageModel,
    } = context;

    return {
        // Stateless tools
        getWeather,
        searchWeb,

        // Contextual tools
        createDocument: createDocumentTool({
            session,
            dataStream,
            chatId,
        }),

        updateDocument: updateDocumentTool({
            session,
            dataStream,
            getDocument,
        }),

        // Suggestions tool (only if model provided)
        ...(languageModel
            ? {
                  requestSuggestions: requestSuggestionsTool({
                      session,
                      dataStream,
                      getDocument,
                      saveSuggestions,
                      languageModel,
                  }),
              }
            : {}),
    };
}
