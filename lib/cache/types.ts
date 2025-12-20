/**
 * Cache Types
 * Ref: 04-cache-layer-optimal-design.md §3
 *
 * Extracted from OldApp: oldapp/lib/cache/types.ts
 */

import type { Visibility } from '@/lib/db';

/**
 * Cached chat metadata
 */
export interface CachedChatMeta {
  id: string;
  userId: string;
  title: string;
  visibility: Visibility;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  lastContext?: Record<string, unknown>;
  version: number;
}

/**
 * Cached message
 */
export interface CachedMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  parts: unknown[];
  attachments?: unknown[];
  createdAt: number; // Unix timestamp
}

/**
 * Full cached chat (metadata + messages)
 */
export interface CachedChat {
  meta: CachedChatMeta;
  messages: CachedMessage[];
}

/**
 * User chat list item
 */
export interface CachedUserChatItem {
  chatId: string;
  title: string;
  updatedAt: number;
}

/**
 * Cached document
 */
export interface CachedDocument {
  id: string;
  userId: string;
  chatId?: string;
  versions: CachedDocumentVersion[];
}

/**
 * Cached document version
 */
export interface CachedDocumentVersion {
  title: string;
  content: string | null;
  kind: 'text' | 'code' | 'image' | 'sheet';
  createdAt: number;
  updatedAt: number;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  isOpen: boolean;
}

/**
 * Cache operation options
 */
export interface CacheOptions {
  /** TTL in seconds (undefined = no expiry) */
  ttl?: number;
  /** Skip cache if circuit breaker is open */
  skipOnCircuitOpen?: boolean;
}
