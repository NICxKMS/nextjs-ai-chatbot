/**
 * Cached Data Layer
 *
 * This module provides cache-integrated data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback, background warm
 * - WRITE: Write to DB, then update cache
 * - DELETE: Delete from DB, then delete from cache
 * - GUEST: Cache-only (no DB calls)
 */

// Chat operations
export {
    createChatCached,
    deleteAllUserChatsCached,
    deleteChatCached,
    getChatCached,
    getChatWithMessagesCached,
    getUserChatsCached,
    updateChatTitleCached,
    updateChatVisibilityCached,
} from "./chat";
// Document operations
export {
    appendVersionCached,
    createDocumentCached,
    deleteDocumentCached,
    deleteVersionsAfterTimestampCached,
    getAllVersionsCached,
    getDocumentCached,
    getLatestVersionCached,
} from "./documents";
// Message operations
export {
    appendMessageCached,
    appendMessagesCached,
    deleteMessagesAfterTimestampCached,
    getMessagesCached,
} from "./messages";
// Suggestion operations
export {
    getSuggestionsCached,
    invalidateSuggestionsCache,
    saveSuggestionsCached,
} from "./suggestions";
// Vote operations
export {
    deleteVoteCached,
    getVoteCached,
    getVotesByChatIdCached,
    saveVoteCached,
} from "./votes";
