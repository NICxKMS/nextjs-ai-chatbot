/**
 * Core data layer type definitions
 *
 * These types mirror the database schema and provide
 * type-safe access to data entities throughout the application.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type Visibility = "public" | "private";
export type Role = "user" | "assistant" | "system";
export type DocumentKind = "text" | "code" | "image" | "sheet";

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * User entity - represents an authenticated user
 */
export type User = {
    id: string;
    email: string;
    passwordHash: string | null;
    createdAt: Date;
    lastLogin: Date | null;
};

/**
 * Chat entity - represents a conversation session
 */
export type Chat = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    userId: string;
    visibility: Visibility;
    lastContext: unknown | null;
};

/**
 * Message entity - represents a single message in a chat
 */
export type Message = {
    id: string;
    chatId: string;
    role: Role;
    parts: unknown;
    attachments: unknown;
    createdAt: Date;
};

/**
 * Document entity - represents an artifact document
 */
export type Document = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    content: string | null;
    kind: DocumentKind;
    userId: string;
    chatId: string;
};

/**
 * Vote entity - represents a user's vote on a message
 */
export type Vote = {
    chatId: string;
    messageId: string;
    userId: string;
    isUpvoted: boolean;
};

/**
 * Suggestion entity - represents an edit suggestion on a document
 */
export type Suggestion = {
    id: string;
    documentId: string;
    documentCreatedAt: Date;
    originalText: string;
    suggestedText: string;
    description: string | null;
    isResolved: boolean;
    userId: string;
    createdAt: Date;
};

// =============================================================================
// INSERT TYPES (for creating new records)
// =============================================================================

export type NewUser = Omit<User, "id" | "createdAt" | "lastLogin"> & {
    id?: string;
    createdAt?: Date;
    lastLogin?: Date | null;
};

export type NewChat = Omit<Chat, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type NewMessage = Omit<Message, "id" | "createdAt"> & {
    id?: string;
    createdAt?: Date;
};

export type NewDocument = Omit<Document, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type NewVote = Vote;

export type NewSuggestion = Omit<Suggestion, "id" | "createdAt"> & {
    id?: string;
    createdAt?: Date;
};

// =============================================================================
// PARTIAL TYPES (for updates)
// =============================================================================

export type PartialUser = Partial<Omit<User, "id">> & { id: string };
export type PartialChat = Partial<Omit<Chat, "id">> & { id: string };
export type PartialMessage = Partial<Omit<Message, "id">> & { id: string };
export type PartialDocument = Partial<Omit<Document, "id">> & { id: string };
export type PartialSuggestion = Partial<Omit<Suggestion, "id">> & {
    id: string;
};
