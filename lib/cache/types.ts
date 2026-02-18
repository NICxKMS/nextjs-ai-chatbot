/**
 * Cache Entity Types
 *
 * Type definitions for cached data structures used in the tiered cache system.
 * These types are optimized for Redis serialization with ISO string dates.
 *
 * Key design decisions:
 * - Dates as ISO strings for JSON serialization
 * - Separate meta/messages for efficient ZSET operations
 * - Version field for cache invalidation
 *
 * @module lib/cache/types
 */

// =============================================================================
// Re-exports from Feature Modules
// =============================================================================

// ArtifactKind is defined in features/artifact/types.ts
export type { ArtifactKind } from "@/features/artifact/types"
// VisibilityType is defined in features/chat/components/visibility-selector.tsx
export type { VisibilityType } from "@/features/chat/components"

// Import AppUsage for internal use only (already exported from lib/ai)
import type { AppUsage } from "@/features/chat/types"

// =============================================================================
// Message Part Types (re-exported from lib/types/message-parts.ts)
// =============================================================================

// Re-export all message part types and utilities from the canonical source
export type {
	ArtifactPart,
	CodePart,
	FilePart,
	ImagePart,
	MessageAttachment,
	MessagePart,
	ModelPart,
	ReasoningPart,
	SourcePart,
	StepPart,
	TextPart,
	ToolCallPart,
	ToolResultPart,
	UnknownPart,
} from "@/lib/types/message-parts"
// Re-export type guards
// Re-export utility functions
export {
	attachmentToFilePart,
	extractFileUrlsFromParts,
	extractTextFromParts,
	filePartToAttachment,
	getFileName,
	getMediaType,
	hasArtifacts,
	hasCode,
	hasImages,
	hasReasoning,
	hasSources,
	hasToolCalls,
	isArtifactPart,
	isCodePart,
	isFilePart,
	isImagePart,
	isMessagePart,
	isModelPart,
	isReasoningPart,
	isSourcePart,
	isStepPart,
	isTextPart,
	isToolCallPart,
	isToolResultPart,
	parseMessageParts,
} from "@/lib/types/message-parts"

// Import types for internal use in cache entity types
import type { MessageAttachment, MessagePart } from "@/lib/types/message-parts"

// =============================================================================
// Cache Entity Types
// =============================================================================

/**
 * Cached chat metadata stored as JSON string.
 *
 * Redis key pattern: chat:{chatId}:{userId}:meta
 *
 * This structure excludes messages for efficient operations:
 * - O(1) metadata updates without touching messages
 * - Smaller payload for chat list queries
 *
 * @example
 * ```typescript
 * const meta: CachedChatMeta = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   userId: 'user-123',
 *   title: 'My Chat',
 *   visibility: 'private',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 *   updatedAt: '2024-01-15T11:45:00.000Z',
 *   lastContext: null,
 *   version: 1
 * };
 * ```
 */
export interface CachedChatMeta {
	/** Chat UUID */
	id: string
	/** Owner user UUID */
	userId: string
	/** Chat title */
	title: string
	/** Visibility setting */
	visibility: "public" | "private"
	/** Creation timestamp (ISO string for JSON serialization) */
	createdAt: string
	/** Last update timestamp (ISO string for JSON serialization) */
	updatedAt: string
	/** Last usage context for state restoration */
	lastContext: AppUsage | null
	/** Cache version for invalidation */
	version: number
}

/**
 * Full cached chat structure assembled from meta + messages.
 *
 * This type represents the complete chat data structure that gets
 * assembled from the separate meta and messages cache keys.
 *
 * @example
 * ```typescript
 * const chat: CachedChat = {
 *   ...meta,
 *   messages: [message1, message2]
 * };
 * ```
 */
export interface CachedChat extends CachedChatMeta {
	/** All messages in the chat, ordered by createdAt */
	messages: CachedMessage[]
}

/**
 * Cached message stored in Redis ZSET.
 *
 * Redis key pattern: chat:{chatId}:{userId}:msgs
 * ZSET score: createdAt timestamp in milliseconds
 *
 * The ZSET structure enables:
 * - O(log N) message append via ZADD
 * - O(log N + M) range deletion via ZREMRANGEBYSCORE
 * - O(log N + M) range queries via ZRANGEBYSCORE
 * - Natural time-based ordering
 *
 * @example
 * ```typescript
 * const message: CachedMessage = {
 *   id: 'msg-123',
 *   chatId: 'chat-456',
 *   role: 'user',
 *   parts: [{ type: 'text', text: 'Hello!' }],
 *   attachments: [],
 *   createdAt: '2024-01-15T10:30:00.000Z'
 * };
 * ```
 */
export interface CachedMessage {
	/** Message UUID */
	id: string
	/** Parent chat UUID */
	chatId: string
	/** Message sender role */
	role: "user" | "assistant" | "system"
	/** Structured message parts (content blocks) */
	parts: MessagePart[]
	/** File attachments metadata */
	attachments: MessageAttachment[]
	/** Creation timestamp (ISO string for JSON serialization) */
	createdAt: string
}

/**
 * User chat list item for ZSET.
 *
 * Redis key pattern: user:{userId}:chats
 * ZSET score: updatedAt timestamp in milliseconds
 *
 * This lightweight structure is stored in the user's chat list
 * for efficient chat listing without loading full chat data.
 *
 * @example
 * ```typescript
 * const item: UserChatListItem = {
 *   chatId: 'chat-123',
 *   title: 'My Chat',
 *   updatedAt: 1705312800000
 * };
 * ```
 */
export interface UserChatListItem {
	/** Chat UUID */
	chatId: string
	/** Chat title for display */
	title: string
	/** Last update timestamp (Unix ms for ZSET score) */
	updatedAt: number
}

/**
 * Cached document with version history.
 *
 * Redis key pattern: document:{documentId}:{userId}
 *
 * Stores all versions of a document for version history navigation.
 *
 * @example
 * ```typescript
 * const doc: CachedDocument = {
 *   id: 'doc-123',
 *   userId: 'user-456',
 *   chatId: 'chat-789',
 *   versions: [
 *     { title: 'Draft', content: '...', kind: 'text', createdAt: '...', updatedAt: '...' }
 *   ]
 * };
 * ```
 */
export interface CachedDocument {
	/** Document UUID */
	id: string
	/** Owner user UUID */
	userId: string
	/** Associated chat UUID */
	chatId: string
	/** All versions of the document */
	versions: DocumentVersion[]
}

/**
 * Document version entry.
 *
 * Each version represents a snapshot of the document at a point in time.
 *
 * @example
 * ```typescript
 * const version: DocumentVersion = {
 *   title: 'My Document',
 *   content: '# Hello World\n\nThis is my document.',
 *   kind: 'text',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 *   updatedAt: '2024-01-15T11:45:00.000Z'
 * };
 * ```
 */
export interface DocumentVersion {
	/** Document title */
	title: string
	/** Document content (text, code, etc.) */
	content: string | null
	/** Document type */
	kind: "text" | "code" | "image" | "sheet"
	/** Version creation timestamp (ISO string) */
	createdAt: string
	/** Version update timestamp (ISO string) */
	updatedAt: string
}

// =============================================================================
// Cache Entity Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid CachedChatMeta.
 */
export function isCachedChatMeta(value: unknown): value is CachedChatMeta {
	if (typeof value !== "object" || value === null) return false
	const meta = value as CachedChatMeta
	return (
		typeof meta.id === "string" &&
		typeof meta.userId === "string" &&
		typeof meta.title === "string" &&
		(meta.visibility === "public" || meta.visibility === "private") &&
		typeof meta.createdAt === "string" &&
		typeof meta.updatedAt === "string" &&
		typeof meta.version === "number"
	)
}

/**
 * Type guard to check if a value is a valid CachedMessage.
 */
export function isCachedMessage(value: unknown): value is CachedMessage {
	if (typeof value !== "object" || value === null) return false
	const msg = value as CachedMessage
	return (
		typeof msg.id === "string" &&
		typeof msg.chatId === "string" &&
		(msg.role === "user" ||
			msg.role === "assistant" ||
			msg.role === "system") &&
		Array.isArray(msg.parts) &&
		Array.isArray(msg.attachments) &&
		typeof msg.createdAt === "string"
	)
}

/**
 * Type guard to check if a value is a valid UserChatListItem.
 */
export function isUserChatListItem(value: unknown): value is UserChatListItem {
	if (typeof value !== "object" || value === null) return false
	const item = value as UserChatListItem
	return (
		typeof item.chatId === "string" &&
		typeof item.title === "string" &&
		typeof item.updatedAt === "number"
	)
}
