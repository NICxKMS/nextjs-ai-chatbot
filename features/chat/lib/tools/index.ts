/**
 * Chat Tools Barrel Export
 *
 * Re-exports all AI tools for chat functionality.
 * Tools are used by the AI model to interact with the system.
 *
 * @module features/chat/lib/tools
 */

// =============================================================================
// Error Handling
// =============================================================================

export {
	isToolExecutionError,
	type ToolErrorCode,
	ToolErrorCodes,
	ToolExecutionError,
} from "./errors"

// =============================================================================
// Weather Tool
// =============================================================================

export {
	WEATHER_TOOL_NAME,
	weatherTool,
} from "./weather.tool"

// =============================================================================
// Document Tools
// =============================================================================

export {
	CREATE_DOCUMENT_TOOL_NAME,
	type CreateDocumentContext,
	createCreateDocumentTool,
	createDocument,
} from "./create-document.tool"

export {
	createUpdateDocumentTool,
	UPDATE_DOCUMENT_TOOL_NAME,
	type UpdateDocumentContext,
	updateDocument,
} from "./update-document.tool"

// =============================================================================
// Suggestions Tool
// =============================================================================

export {
	createSuggestionsTool,
	requestSuggestions,
	SUGGESTIONS_TOOL_NAME,
	type SuggestionsContext,
} from "./suggestions.tool"

// =============================================================================
// Tool Registry Helper
// =============================================================================

import {
	type CreateDocumentContext,
	createCreateDocumentTool,
} from "./create-document.tool"
import {
	createSuggestionsTool,
	type SuggestionsContext,
} from "./suggestions.tool"
import {
	createUpdateDocumentTool,
	type UpdateDocumentContext,
} from "./update-document.tool"
import { weatherTool } from "./weather.tool"

/**
 * Context for all document-related tools
 */
export interface DocumentToolsContext {
	/** User session ID */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
	/** Chat ID for document association */
	chatId: string
	/** Data stream writer for real-time updates */
	dataStream: CreateDocumentContext["dataStream"] &
		UpdateDocumentContext["dataStream"] &
		SuggestionsContext["dataStream"]
	/** Optional AI model for suggestions */
	model?: SuggestionsContext["model"]
}

/**
 * Creates all chat tools with the provided context.
 *
 * This helper function creates all tools with a single context object,
 * useful for registering tools in the chat route.
 *
 * @param context - Shared context for all tools
 * @returns Object containing all configured tools
 *
 * @example
 * ```typescript
 * const tools = createChatTools({
 *   userId: session.user.id,
 *   isGuest: false,
 *   chatId: 'chat-123',
 *   dataStream: writer,
 *   model: myProvider.languageModel('artifact-model'),
 * });
 *
 * // Use in streamText
 * const result = streamText({
 *   model,
 *   tools,
 *   ...
 * });
 * ```
 */
export function createChatTools(context: DocumentToolsContext) {
	return {
		// Weather tool doesn't need context
		getWeather: weatherTool,

		// Document tools with context
		createDocument: createCreateDocumentTool({
			userId: context.userId,
			isGuest: context.isGuest,
			chatId: context.chatId,
			dataStream: context.dataStream,
		}),

		updateDocument: createUpdateDocumentTool({
			userId: context.userId,
			isGuest: context.isGuest,
			dataStream: context.dataStream,
		}),

		requestSuggestions: createSuggestionsTool({
			userId: context.userId,
			isGuest: context.isGuest,
			dataStream: context.dataStream,
			...(context.model ? { model: context.model } : {}),
		}),
	}
}

/**
 * Type for the chat tools object returned by createChatTools
 */
export type ChatTools = ReturnType<typeof createChatTools>
