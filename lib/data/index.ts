/**
 * Data Layer - Public API
 * Ref: 03-data-layer-optimal-design.md
 *
 * @module lib/data
 */

// Types
export type {
  DataContext,
  PaginationParams,
  PaginatedResult,
  OperationResult,
} from './types';
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './types';

// Base utilities
export { isGuest, createContext, requireNonGuest } from './base';

// Chat data
export { chatData } from './chat';
export {
  getChat,
  getChatWithMessages,
  listChats,
  chatExists,
  getChatCount,
  createChat,
  deleteChat,
  deleteAllChats,
  updateChatTitle,
  updateChatVisibility,
  updateChatContext,
  touchChat,
} from './chat';

// Document data
export { documentData } from './documents';
export {
  getDocument,
  getAllDocuments,
  saveDocument,
  deleteDocumentsAfterTimestamp,
  getDocumentSuggestions,
  saveSuggestions,
} from './documents';
export type { DocumentSaveParams } from './documents';
