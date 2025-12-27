/**
 * Message Part Constants
 *
 * Shared constants for message part rendering.
 *
 * @module features/chat/components/message/message-part/constants
 */

/** Document-related tool names */
export const DOCUMENT_TOOL_NAMES = [
    "createDocument",
    "updateDocument",
    "requestSuggestions",
] as const;

/** Weather tool name */
export const WEATHER_TOOL_NAME = "getWeather" as const;

export type DocumentToolName = (typeof DOCUMENT_TOOL_NAMES)[number];
