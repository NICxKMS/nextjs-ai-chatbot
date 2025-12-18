import "server-only";

/**
 * Cache Layer - Public API
 *
 * High-performance caching layer for sub-50ms reads using Upstash Redis.
 * All exports are server-only - cannot be imported in client components.
 *
 * @module cache
 */

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export {
    getRedisClient,
    isRedisAvailable,
    requireRedisClient,
} from "./client";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type {
    // Cache configuration
    CacheConfig,
    // Chat types
    CachedChat,
    CachedChatMeta,
    // Document types
    CachedDocument,
    CachedMessage,
    CacheOperationResult,
    CacheWriteResult,
    DocumentVersion,
    // Re-exported message types
    MessageAttachment,
    MessagePart,
    UserChatListItem,
} from "./types";

export { DEFAULT_CACHE_CONFIG } from "./types";

// -----------------------------------------------------------------------------
// Keys
// -----------------------------------------------------------------------------

export type { ChatCacheKeys, DocumentCacheKeys } from "./keys";
export {
    CacheKeys,
    getChatKeys,
    getChatPattern,
    getDocumentKeys,
    getDocumentPattern,
    getMessageScore,
    getUserChatsScore,
} from "./keys";

// -----------------------------------------------------------------------------
// Circuit Breaker
// -----------------------------------------------------------------------------

export {
    configureCircuitBreaker,
    getCircuitStatus,
    isCircuitOpen,
    recordFailure,
    recordSuccess,
    withCircuitBreaker,
    withCircuitBreakerThrow,
} from "./circuit-breaker";

// -----------------------------------------------------------------------------
// Scripts
// -----------------------------------------------------------------------------

export type { CacheScriptName } from "./scripts";
export {
    APPEND_DOCUMENT_VERSION,
    APPEND_MESSAGE_ATOMIC,
    APPEND_MESSAGE_WITH_LIMIT,
    ATOMIC_CHAT_UPDATE,
    BATCH_APPEND_MESSAGES_ATOMIC,
    CACHE_SCRIPTS,
    DELETE_ALL_USER_CHATS,
    DELETE_DOCUMENT_VERSIONS_AFTER,
    DELETE_MESSAGES_IN_RANGE,
} from "./scripts";

// -----------------------------------------------------------------------------
// Chat Operations
// -----------------------------------------------------------------------------

export {
    deleteChatFromCache,
    deleteChatsFromCache,
    getChatFromCache,
    getChatMetaFromCache,
    setChatInCache,
    setChatMetaInCache,
} from "./chat";

// -----------------------------------------------------------------------------
// Document Operations
// -----------------------------------------------------------------------------

export {
    appendDocumentVersionToCache,
    clearDocumentVersionsFromCache,
    createDocumentInCacheIfNotExists,
    deleteDocumentFromCache,
    deleteDocumentsFromCache,
    deleteDocumentVersionsAfterTimestamp,
    documentExistsInCache,
    getDocumentFromCache,
    getDocumentVersionsFromCache,
    getLatestDocumentVersionFromCache,
    setDocumentInCache,
    updateDocumentInCache,
} from "./document";
