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
import {
    createDocument,
    type CreateDocumentToolProps,
} from "./create-document";
import {
    updateDocument,
    type UpdateDocumentToolProps,
} from "./update-document";
import { getWeather } from "./get-weather";
import {
    requestSuggestions,
    type RequestSuggestionsToolProps,
} from "./request-suggestions";

// Re-export tools and types
export {
    createDocument,
    type CreateDocumentToolProps,
} from "./create-document";
export {
    updateDocument,
    type UpdateDocumentToolProps,
} from "./update-document";
export { getWeather, type WeatherAtLocation } from "./get-weather";
export {
    requestSuggestions,
    type RequestSuggestionsToolProps,
} from "./request-suggestions";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for getting all available tools.
 */
export interface GetToolsProps {
    /** Current user session */
    session: AppSession;
    /** UI message stream writer for sending artifact data */
    dataStream: UIMessageStreamWriter;
    /** Chat ID for associating documents */
    chatId: string;
}

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
        getWeather: getWeather,
        requestSuggestions: requestSuggestions({ session, dataStream }),
    };
}
