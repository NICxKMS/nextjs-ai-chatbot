/**
 * Database module barrel export
 *
 * This module provides the Drizzle ORM client configured for PostgreSQL
 * with connection pooling optimized for serverless environments.
 *
 * @module lib/db
 */

// =============================================================================
// Database Client
// =============================================================================

export {
	closeConnection,
	db,
	isHealthy,
	withSequentialTransactions,
	withTransaction,
} from "./client"

// =============================================================================
// Batch Operations
// =============================================================================

export {
	type BatchDeleteOptions,
	type BatchInsertOptions,
	type BatchResult,
	type BatchUpdateOptions,
	type BatchUpsertOptions,
	batchDelete,
	batchInsert,
	batchUpdate,
	batchUpsert,
	batchWithResult,
} from "./batch"

// =============================================================================
// Cursor-Based Pagination
// =============================================================================

export {
	buildCursorCondition,
	type CursorPaginatedResult,
	type CursorPaginationOptions,
	createPaginationResponse,
	decodeCursor,
	encodeCursor,
	type PaginationDirection,
	paginate,
	paginateWithCount,
	toCursorOptions,
	toPaginatedResult,
} from "./pagination"

// =============================================================================
// Schema Re-exports
// =============================================================================

// Export types for convenience
export type {
	Artifact,
	Chat,
	DBMessage,
	Document,
	Message,
	MessageRow,
	NewArtifact,
	NewChat,
	NewDocument,
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
} from "./schema"

// Re-export all schema tables, enums, relations, and types
export * from "./schema"
