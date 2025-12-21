/**
 * AI Tools - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * Exports all AI tools for use in chat streaming.
 *
 * @module lib/ai/tools
 */

import type { UIMessageStreamWriter } from "ai";

import type { AppSession } from "@/lib/auth/types";
import { createDocument } from "./create-document";
import { getWeather } from "./get-weather";
import { requestSuggestions } from "./request-suggestions";
import { updateDocument } from "./update-document";

// Re-export tools and types
export {
    type CreateDocumentToolProps,
    createDocument,
} from "./create-document";
export { getWeather, type WeatherAtLocation } from "./get-weather";
export {
    type RequestSuggestionsToolProps,
    requestSuggestions,
} from "./request-suggestions";
export {
    type UpdateDocumentToolProps,
    updateDocument,
} from "./update-document";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for getting all available tools.
 */
export type GetToolsProps = {
    /** Current user session */
    session: AppSession;
    /** UI message stream writer for sending artifact data */
    dataStream: UIMessageStreamWriter;
    /** Chat ID for associating documents */
    chatId: string;
};

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * Get all available AI tools.
 *
 * Returns an object containing all registered tools, ready for use
 * in streamText calls.
 *
 * @param props - Tool configuration
 * @returns Object containing all tools
 *
 * @example
 * ```ts
 * const result = streamText({
 *   model,
 *   messages,
 *   tools: getTools({ session, dataStream, chatId }),
 * });
 * ```
 */
export function getTools({ session, dataStream, chatId }: GetToolsProps) {
    return {
        createDocument: createDocument({ session, dataStream, chatId }),
        updateDocument: updateDocument({ session, dataStream }),
        getWeather,
        requestSuggestions: requestSuggestions({ session, dataStream }),
    };
}
