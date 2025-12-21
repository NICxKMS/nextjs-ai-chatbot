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
  getChatCached,
  getChatWithMessagesCached,
  getUserChatsCached,
  createChatCached,
  deleteChatCached,
  deleteAllUserChatsCached,
  updateChatTitleCached,
  updateChatVisibilityCached,
} from './chat';

// Message operations
export {
  getMessagesCached,
  appendMessageCached,
  appendMessagesCached,
  deleteMessagesAfterTimestampCached,
} from './messages';

// Document operations
export {
  getDocumentCached,
  getLatestVersionCached,
  getAllVersionsCached,
  createDocumentCached,
  appendVersionCached,
  deleteDocumentCached,
} from './documents';

// Vote operations
export {
  getVoteCached,
  getVotesByChatIdCached,
  saveVoteCached,
  deleteVoteCached,
} from './votes';

// Suggestion operations
export {
  getSuggestionsCached,
  saveSuggestionsCached,
  invalidateSuggestionsCache,
} from './suggestions';
