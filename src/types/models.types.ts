/**
 * Domain Model Types
 * @module @/src/types/models.types
 *
 * Type definitions for domain entities.
 * After Phase 2, these will be inferred from Drizzle schema.
 */

// ============================================================================
// Common Mixins
// ============================================================================

export interface WithTimestamps {
	createdAt: Date;
	updatedAt: Date;
}

export interface WithUserId {
	userId: string;
}

export interface WithSoftDelete {
	deletedAt: Date | null;
}

// ============================================================================
// User Domain
// ============================================================================

export interface User extends WithTimestamps {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	emailVerified: Date | null;
}

export interface NewUser {
	email: string;
	name?: string | null;
	image?: string | null;
}

export interface UpdateUser {
	email?: string;
	name?: string | null;
	image?: string | null;
}

// ============================================================================
// Chat Domain
// ============================================================================

export type ChatVisibility = "public" | "private";

export interface Chat extends WithTimestamps, WithUserId {
	id: string;
	title: string;
	visibility: ChatVisibility;
}

export interface NewChat {
	id?: string;
	userId: string;
	title: string;
	visibility?: ChatVisibility;
}

export interface UpdateChat {
	title?: string;
	visibility?: ChatVisibility;
}

// ============================================================================
// Message Domain
// ============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message extends WithTimestamps {
	id: string;
	chatId: string;
	role: MessageRole;
	content: string;
	toolInvocations?: unknown;
	experimental_attachments?: unknown;
}

export interface NewMessage {
	id?: string;
	chatId: string;
	role: MessageRole;
	content: string;
	toolInvocations?: unknown;
	experimental_attachments?: unknown;
}

// ============================================================================
// Vote Domain
// ============================================================================

export interface Vote {
	chatId: string;
	messageId: string;
	isUpvoted: boolean;
}

export interface NewVote {
	chatId: string;
	messageId: string;
	isUpvoted: boolean;
}

// ============================================================================
// Document Domain
// ============================================================================

export type DocumentKind = "text" | "code" | "image" | "sheet";

export interface Document extends WithTimestamps, WithUserId {
	id: string;
	title: string;
	content: string | null;
	kind: DocumentKind;
}

export interface NewDocument {
	id?: string;
	userId: string;
	title: string;
	content?: string | null;
	kind?: DocumentKind;
}

export interface UpdateDocument {
	title?: string;
	content?: string | null;
	kind?: DocumentKind;
}

// ============================================================================
// Suggestion Domain
// ============================================================================

export interface Suggestion {
	id: string;
	documentId: string;
	documentCreatedAt: Date;
	originalText: string;
	suggestedText: string;
	description: string | null;
	isResolved: boolean;
	userId: string;
	createdAt: Date;
}

export interface NewSuggestion {
	id?: string;
	documentId: string;
	documentCreatedAt: Date;
	originalText: string;
	suggestedText: string;
	description?: string | null;
	userId: string;
}

// ============================================================================
// Stream Domain (for AI responses)
// ============================================================================

export interface StreamPart {
	type: "text" | "tool-call" | "tool-result" | "error";
	content: unknown;
}

export interface StreamMetadata {
	model: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
}

// ============================================================================
// Drizzle Type Re-exports
// These types are inferred from the database schema for type safety
// ============================================================================

export type {
	Chat as DrizzleChat,
	Document as DrizzleDocument,
	DocumentKind as DrizzleDocumentKind,
	Message as DrizzleMessage,
	MessageRole as DrizzleMessageRole,
	NewChat as DrizzleNewChat,
	NewDocument as DrizzleNewDocument,
	NewMessage as DrizzleNewMessage,
	NewSuggestion as DrizzleNewSuggestion,
	NewUser as DrizzleNewUser,
	NewVote as DrizzleNewVote,
	Suggestion as DrizzleSuggestion,
	User as DrizzleUser,
	Visibility as DrizzleVisibility,
	Vote as DrizzleVote,
} from "@/lib/db/schema";
