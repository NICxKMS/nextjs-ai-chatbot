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
export {
    appendMessageCached,
    appendMessagesCached,
    appendVersionCached,
    createChatCached,
    createDocumentCached,
    deleteAllUserChatsCached,
    deleteChatCached,
    deleteDocumentCached,
    deleteMessagesAfterTimestampCached,
    deleteVersionsAfterTimestampCached,
    deleteVoteCached,
    getAllVersionsCached,
    getChatCached,
    getChatWithMessagesCached,
    getDocumentCached,
    getLatestVersionCached,
    getMessagesCached,
    getSuggestionsCached,
    getUserChatsCached,
    getVoteCached,
    getVotesByChatIdCached,
    invalidateSuggestionsCache,
    saveSuggestionsCached,
    saveVoteCached,
    updateChatTitleCached,
    updateChatVisibilityCached,
} from "./cached";
// ============================================================================
// Raw DB operations (for internal/admin use)
// ============================================================================
export * as chatDb from "./chat";
// Re-export types needed for raw operations
export type { DocumentSaveParams } from "./documents";
export * as documentDb from "./documents";
export type { MigrationResult } from "./migrate-guest";
// ============================================================================
// Migration (SEC-003)
// ============================================================================
export { isGuestId, migrateGuestToAuthUser } from "./migrate-guest";
// ============================================================================
// Parallel data loading (PERF-002)
// ============================================================================
export type {
    ChatPageData,
    LoadChatPageOptions,
    UIVote,
} from "./parallel-loader";
export {
    hasValidChatData,
    loadChatPageData,
    loadChatsInParallel,
} from "./parallel-loader";
// Types (shared across all operations)
export type {
    DataContext,
    OperationResult,
    PaginatedResult,
    PaginationParams,
} from "./types";
export {
    DEFAULT_PAGE_SIZE,
    // Null object patterns (P3-019)
    EMPTY_DATA_CONTEXT,
    isEmptyDataContext,
    MAX_PAGE_SIZE,
} from "./types";
export type { SaveVoteParams, VoteType } from "./votes";
export * as voteDb from "./votes";
