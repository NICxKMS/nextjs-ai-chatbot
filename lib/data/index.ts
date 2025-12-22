/**
 * Data Layer - Public API
 * Ref: 03-data-layer-optimal-design.md
 *
 * @module lib/data
 */

// Base utilities
export { createContext, isGuest, requireNonGuest } from "./base";
// ============================================================================
// Cached operations (recommended for API routes)
// ============================================================================
export * from "./cached";
// ============================================================================
// Raw DB operations (for internal/admin use)
// ============================================================================
export * as chatDb from "./chat";
// Re-export types needed for raw operations
export type { DocumentSaveParams } from "./documents";
export * as documentDb from "./documents";
// Types (shared across all operations)
export type {
    DataContext,
    OperationResult,
    PaginatedResult,
    PaginationParams,
} from "./types";
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./types";
export type { SaveVoteParams, VoteType } from "./votes";
export * as voteDb from "./votes";
