/**
 * Cache Operations Module
 * Ref: 04-cache-layer-optimal-design.md §4
 *
 * Public API for all Redis cache operations.
 * Provides type-safe, atomic operations for chats, messages, documents, and quotas.
 *
 * @module lib/cache-ops
 */

// Chat operations
export {
    chatExistsInCache,
    createChatInCache,
    deleteAllUserChatsFromCache,
    deleteChatFromCache,
    forkChatInCache,
    getChatFromCache,
    getUserChatsFromCache,
    updateChatInCache,
} from "./chat";
// Document operations (ZSET hybrid)
export {
    appendVersionToCache,
    createDocumentInCache,
    deleteDocumentFromCache,
    forkDocumentInCache,
    getAllVersionsFromCache,
    getDocumentMetaFromCache,
    getDocumentWithLatestFromCache,
    getLatestVersionFromCache,
    getUserDocumentsFromCache,
    pruneVersionsInCache,
} from "./documents";
// Message operations
export {
    appendMessagesToCache,
    appendMessageToCache,
    deleteMessagesAfterTimestamp,
    getMessageCount,
    getMessagesAfterTimestamp,
    getMessagesFromCache,
} from "./messages";
// PERF-004: Cache prewarming operations
export { prewarmIfCold, prewarmUserCache } from "./prewarm";
// Quota operations
export {
    checkQuota,
    incrementQuota,
    isQuotaAvailable,
    resetQuota,
} from "./quota";
// Re-export Lua scripts (for advanced use)
export {
    APPEND_MESSAGE_SCRIPT,
    APPEND_MESSAGES_BULK_SCRIPT,
    APPEND_VERSION_SCRIPT,
    CREATE_CHAT_SCRIPT,
    DELETE_ALL_USER_CHATS_SCRIPT,
    DELETE_CHAT_SCRIPT,
    FORK_CHAT_SCRIPT,
    FORK_DOCUMENT_SCRIPT,
    INCREMENT_QUOTA_SCRIPT,
    PRUNE_VERSIONS_SCRIPT,
    SCRIPTS,
    type ScriptName,
    UPDATE_METADATA_SCRIPT,
} from "./scripts";
export type { CachedSuggestion } from "./suggestions";
// Suggestion operations
export {
    deleteSuggestionsFromCache,
    getSuggestionsFromCache,
    setSuggestionsInCache,
} from "./suggestions";
// Vote operations
export {
    deleteVoteFromCache,
    getVoteFromCache,
    setVoteInCache,
} from "./votes";
