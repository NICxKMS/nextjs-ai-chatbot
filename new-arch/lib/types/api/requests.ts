/**
 * API Request Types
 * @module lib/types/api/requests
 *
 * Type definitions for API request bodies.
 */

import type { Attachment, ChatVisibility } from "../domain";

// =============================================================================
// CHAT REQUESTS
// =============================================================================

/**
 * Request body for creating a new chat
 */
export type CreateChatRequest = {
    /** Optional chat title */
    title?: string;
    /** Visibility setting (defaults to 'private') */
    visibility?: ChatVisibility;
};

/**
 * Request body for updating a chat
 */
export type UpdateChatRequest = {
    /** New title */
    title?: string;
    /** New visibility setting */
    visibility?: ChatVisibility;
};

// =============================================================================
// MESSAGE REQUESTS
// =============================================================================

/**
 * Request body for sending a message
 */
export type SendMessageRequest = {
    /** Target chat ID */
    chatId: string;
    /** Message content */
    content: string;
    /** Optional file attachments */
    attachments?: Attachment[];
    /** Optional model override */
    model?: string;
};

/**
 * Request body for regenerating a response
 */
export type RegenerateMessageRequest = {
    /** Chat ID */
    chatId: string;
    /** Message ID to regenerate from */
    messageId: string;
    /** Optional model override */
    model?: string;
};

// =============================================================================
// DOCUMENT REQUESTS
// =============================================================================

/**
 * Request body for creating a document
 */
export type CreateDocumentRequest = {
    /** Document title */
    title: string;
    /** Initial content */
    content?: string;
    /** Document kind */
    kind: "text" | "code" | "image" | "sheet";
    /** Associated chat ID */
    chatId: string;
};

/**
 * Request body for updating a document
 */
export type UpdateDocumentRequest = {
    /** New title */
    title?: string;
    /** New content */
    content?: string;
};

// =============================================================================
// VOTE REQUESTS
// =============================================================================

/**
 * Request body for voting on a message
 */
export type VoteRequest = {
    /** Chat ID */
    chatId: string;
    /** Message ID */
    messageId: string;
    /** Vote direction (true = upvote) */
    isUpvoted: boolean;
};

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Common pagination parameters
 */
export type PaginationParams = {
    /** Number of items to return */
    limit?: number;
    /** Cursor for pagination */
    cursor?: string;
    /** Sort order */
    order?: "asc" | "desc";
};

/**
 * Chat list request parameters
 */
export type ListChatsRequest = PaginationParams & {
    /** Filter by visibility */
    visibility?: ChatVisibility;
};

/**
 * Message list request parameters
 */
export type ListMessagesRequest = PaginationParams & {
    /** Filter by role */
    role?: "user" | "assistant";
};
