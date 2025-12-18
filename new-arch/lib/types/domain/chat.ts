/**
 * Chat Domain Types
 * @module lib/types/domain/chat
 *
 * Type definitions for chat-related entities.
 */

import type { Message } from "./message";

// =============================================================================
// VISIBILITY
// =============================================================================

/**
 * Chat visibility setting
 */
export type ChatVisibility = "public" | "private";

// =============================================================================
// CHAT TYPES
// =============================================================================

/**
 * Base chat entity
 */
export type Chat = {
    /** Unique chat identifier (UUID) */
    id: string;
    /** Owner user ID */
    userId: string;
    /** Chat title */
    title: string;
    /** Visibility setting */
    visibility: ChatVisibility;
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** Optional last context data */
    lastContext?: unknown;
};

/**
 * Chat with its messages included
 */
export type ChatWithMessages = Chat & {
    /** Associated messages */
    messages: Message[];
};

/**
 * Chat list item for sidebar/history
 */
export type ChatListItem = Pick<
    Chat,
    "id" | "title" | "createdAt" | "visibility"
>;

/**
 * Chat summary for search results
 */
export type ChatSummary = {
    id: string;
    title: string;
    messageCount: number;
    lastMessageAt: Date | null;
};
