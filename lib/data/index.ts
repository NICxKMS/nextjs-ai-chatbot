/**
 * Data Layer - Public API
 * Ref: 03-data-layer-optimal-design.md
 *
 * @module lib/data
 */

// Base utilities
export { createContext, isGuest, requireNonGuest } from "./base";
// Chat data
export {
    chatData,
    chatExists,
    createChat,
    deleteAllChats,
    deleteChat,
    getChat,
    getChatCount,
    getChatWithMessages,
    listChats,
    touchChat,
    updateChatContext,
    updateChatTitle,
    updateChatVisibility,
} from "./chat";
export type { DocumentSaveParams } from "./documents";
// Document data
export {
    deleteDocumentsAfterTimestamp,
    documentData,
    getAllDocuments,
    getDocument,
    getDocumentSuggestions,
    saveDocument,
    saveSuggestions,
} from "./documents";
// Types
export type {
    DataContext,
    OperationResult,
    PaginatedResult,
    PaginationParams,
} from "./types";
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./types";
export type { SaveVoteParams, VoteType } from "./votes";
// Vote data
export {
    deleteVote,
    getVote,
    getVotesByChatId,
    saveVote,
    voteData,
} from "./votes";
