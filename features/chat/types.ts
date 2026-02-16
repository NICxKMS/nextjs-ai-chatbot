/**
 * Chat Feature Types
 *
 * Type definitions for the chat feature module.
 *
 * @module features/chat/types
 */

import type { UIMessage } from "ai"

// =============================================================================
// Message Types
// =============================================================================

/**
 * Custom UI data types for chat messages
 */
export interface CustomUIDataTypes {
	[key: string]: unknown
	textDelta: string
	imageDelta: string
	sheetDelta: string
	codeDelta: string
	suggestion: StreamingSuggestion
	appendMessage: AppendMessageData
	id: string
	title: string
	chatTitle: string
	kind: ArtifactKind
	clear: null
	finish: null
	usage: AppUsage
}

/**
 * Message metadata for chat messages
 */
export interface MessageMetadata {
	createdAt: string
}

/**
 * Chat tools available for AI model
 */
export interface ChatTools {
	[key: string]: {
		input: Record<string, unknown>
		output: unknown
	}
	getWeather: {
		input: {
			location: string
		}
		output: WeatherOutput
	}
	createDocument: {
		input: {
			title: string
			kind: ArtifactKind
		}
		output: DocumentOutput
	}
	updateDocument: {
		input: {
			id: string
			content: string
		}
		output: DocumentOutput
	}
	requestSuggestions: {
		input: {
			documentId: string
		}
		output: SuggestionOutput
	}
}

/**
 * Chat message type extending UIMessage with custom types
 */
export type ChatMessage = UIMessage<
	MessageMetadata,
	CustomUIDataTypes,
	ChatTools
>

// =============================================================================
// Vote Types
// =============================================================================

/**
 * User vote on a message (upvote/downvote)
 */
export interface UserVote {
	/** User who voted */
	userId?: string
	/** Chat ID */
	chatId: string
	/** Message ID */
	messageId: string
	/** Vote direction (true = upvote, false = downvote) */
	isUpvoted: boolean
}

// =============================================================================
// Attachment Types
// =============================================================================

/**
 * File attachment for messages
 */
export interface Attachment {
	/** File name */
	name: string
	/** File URL */
	url: string
	/** Content type (MIME type) */
	contentType: string
}

// =============================================================================
// Artifact Types
// =============================================================================

/**
 * Artifact kind/type
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet"

/**
 * Streaming suggestion type - partial Suggestion during streaming
 */
export interface StreamingSuggestion {
	id: string
	artifactId: string
	originalText: string
	suggestedText: string
	description?: string
	isResolved: boolean
}

// =============================================================================
// Tool Output Types
// =============================================================================

/**
 * Weather tool output
 */
export interface WeatherOutput {
	location: string
	temperature: number
	condition: string
}

/**
 * Document tool output
 */
export interface DocumentOutput {
	id: string
	title: string
	kind: ArtifactKind
	content: string
}

/**
 * Suggestion tool output
 */
export interface SuggestionOutput {
	suggestions: StreamingSuggestion[]
}

// =============================================================================
// Usage Types
// =============================================================================

/**
 * App usage tracking data
 */
export interface AppUsage {
	/** Total tokens used */
	totalTokens?: number
	/** Prompt tokens */
	promptTokens?: number
	/** Completion tokens */
	completionTokens?: number
	/** Model used */
	model?: string
}

// =============================================================================
// Data Part Types (for streaming)
// =============================================================================

/**
 * Data part for appending messages
 */
export type AppendMessageData = string | Record<string, unknown>

/**
 * Data part for chat title updates
 */
export interface DataChatTitlePart {
	type: "data-chatTitle"
	data: string
}

/**
 * Data part for message appending
 */
export interface DataAppendMessagePart {
	type: "data-appendMessage"
	data: AppendMessageData
}

/**
 * Data part for usage updates
 */
export interface DataUsagePart {
	type: "data-usage"
	data: AppUsage
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for chat title data parts
 */
export function isDataChatTitlePart(part: unknown): part is DataChatTitlePart {
	return (
		typeof part === "object" &&
		part !== null &&
		(part as DataChatTitlePart).type === "data-chatTitle" &&
		typeof (part as DataChatTitlePart).data === "string"
	)
}

/**
 * Type guard for append message data parts
 */
export function isDataAppendMessagePart(
	part: unknown,
): part is DataAppendMessagePart {
	return (
		typeof part === "object" &&
		part !== null &&
		(part as DataAppendMessagePart).type === "data-appendMessage"
	)
}

/**
 * Type guard for usage data parts
 */
export function isDataUsagePart(part: unknown): part is DataUsagePart {
	return (
		typeof part === "object" &&
		part !== null &&
		(part as DataUsagePart).type === "data-usage"
	)
}
