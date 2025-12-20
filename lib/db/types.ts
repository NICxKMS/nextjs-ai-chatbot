/**
 * Client-Safe Type Exports
 * Ref: 03-data-layer-optimal-design.md §6
 *
 * These types are safe to import in client components
 */

import type { Chat, Message, Suggestion } from './schema';

// Re-export select types (read-only, no DB connection)
export type {
  User,
  Chat,
  Message,
  Vote,
  Document,
  Suggestion,
  Visibility,
} from './schema';

// Message parts type (for AI SDK compatibility)
export interface MessagePart {
  type: 'text' | 'image' | 'file' | 'tool-call' | 'tool-result';
  text?: string;
  image?: string;
  mimeType?: string;
  data?: unknown;
  toolCallId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
}

// Chat with messages type
export interface ChatWithMessages {
  chat: Chat;
  messages: Message[];
}

// Document with suggestions type
export interface DocumentWithSuggestions {
  document: Document;
  suggestions: Suggestion[];
}
