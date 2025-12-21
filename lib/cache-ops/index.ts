/**
 * Cache Operations Module
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Public API for all Redis cache operations.
 * Provides type-safe, atomic operations for chats, messages, documents, and quotas.
 *
 * @module lib/cache-ops
 */

// Message operations
export {
    appendMessageToCache,
    appendMessagesToCache,
    getMessagesFromCache,
    getMessagesAfterTimestamp,
    deleteMessagesAfterTimestamp,
    getMessageCount,
} from "./messages";

// Chat operations
export {
    createChatInCache,
    getChatFromCache,
    updateChatInCache,
    deleteChatFromCache,
    deleteAllUserChatsFromCache,
    getUserChatsFromCache,
    forkChatInCache,
    chatExistsInCache,
} from "./chat";

// Document operations (ZSET hybrid)
export {
    createDocumentInCache,
    getDocumentMetaFromCache,
    getLatestVersionFromCache,
    getDocumentWithLatestFromCache,
    getAllVersionsFromCache,
    appendVersionToCache,
    forkDocumentInCache,
    pruneVersionsInCache,
    deleteDocumentFromCache,
    getUserDocumentsFromCache,
} from "./documents";

// Quota operations
export {
    checkQuota,
    incrementQuota,
    resetQuota,
    isQuotaAvailable,
} from "./quota";

// Vote operations
export {
    getVoteFromCache,
    setVoteInCache,
    deleteVoteFromCache,
} from "./votes";

// Suggestion operations
export {
    getSuggestionsFromCache,
    setSuggestionsInCache,
    deleteSuggestionsFromCache,
} from "./suggestions";
export type { CachedSuggestion } from "./suggestions";

// Re-export Lua scripts (for advanced use)
export * from "./scripts";
