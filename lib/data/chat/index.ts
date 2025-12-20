/**
 * Chat Data Module
 * Ref: 03-data-layer-optimal-design.md §9
 *
 * Composite export of all chat operations
 */
import 'server-only';

import * as read from './read';
import * as write from './write';
import * as update from './update';

/**
 * Chat data access object
 * Provides all chat-related database operations
 */
export const chatData = {
  // Read operations
  get: read.getChat,
  getWithMessages: read.getChatWithMessages,
  list: read.listChats,
  exists: read.chatExists,
  count: read.getChatCount,

  // Write operations
  create: write.createChat,
  delete: write.deleteChat,
  deleteAll: write.deleteAllChats,

  // Update operations
  updateTitle: update.updateChatTitle,
  updateVisibility: update.updateChatVisibility,
  updateContext: update.updateChatContext,
  touch: update.touchChat,
} as const;

// Re-export individual functions for tree-shaking
export {
  getChat,
  getChatWithMessages,
  listChats,
  chatExists,
  getChatCount,
} from './read';

export { createChat, deleteChat, deleteAllChats } from './write';

export {
  updateChatTitle,
  updateChatVisibility,
  updateChatContext,
  touchChat,
} from './update';
