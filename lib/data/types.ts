/**
 * Data Layer Types
 *
 * Shared type definitions for the data layer including context types,
 * pagination utilities, and re-exports of database schema types.
 *
 * @module lib/data/types
 */

import type {
	Artifact,
	Chat,
	Message,
	NewArtifact,
	NewChat,
	NewMessage,
	NewSuggestion,
	NewUser,
	NewVote,
	Suggestion,
	UpdateArtifact,
	UpdateChat,
	UpdateMessage,
	UpdateSuggestion,
	User,
	Vote,
} from "@/lib/db/schema"

// =============================================================================
// Database Type Re-exports
// =============================================================================

/** User entity types */
export type { User, NewUser }

/** Chat entity types */
export type { Chat, NewChat, UpdateChat }

/** Message entity types */
export type { Message, NewMessage, UpdateMessage }

/** Artifact entity types */
export type { Artifact, NewArtifact, UpdateArtifact }

/** Vote entity types */
export type { Vote, NewVote }

/** Suggestion entity types */
export type { Suggestion, NewSuggestion, UpdateSuggestion }

// =============================================================================
// Context Types
// =============================================================================

/**
 * Context for repository operations.
 * Provides user context for ownership checks and authorization.
 */
export interface RepositoryContext {
	/** User ID performing the operation */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
}

/**
 * Context for service operations.
 * Extends repository context with additional session information.
 */
export interface ServiceContext extends RepositoryContext {
	/** User email (if available) */
	email?: string
	/** Session ID for tracking */
	sessionId?: string
}

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Parameters for cursor-based pagination.
 */
export interface PaginationParams {
	/** Maximum number of items to return */
	limit: number
	/** Cursor for forward pagination (item ID to start after) */
	startingAfter?: string | null
	/** Cursor for backward pagination (item ID to end before) */
	endingBefore?: string | null
}

/**
 * Result wrapper for paginated queries.
 */
export interface PaginatedResult<T> {
	/** Array of items for the current page */
	items: T[]
	/** Whether more items exist beyond the current page */
	hasMore: boolean
}

// =============================================================================
// Operation Result Types
// =============================================================================

/**
 * Result of a data operation.
 */
export interface OperationResult<T = void> {
	/** Whether the operation succeeded */
	success: boolean
	/** Result data (if applicable) */
	data?: T
	/** Error message (if failed) */
	error?: string
}

/**
 * Result of a delete operation.
 */
export interface DeleteResult {
	/** Number of items deleted */
	deletedCount: number
}
