import type { VisibilityType, RoleType, ArtifactKind } from '@/lib/db';

export interface CachedChatMeta {
  id: string;
  title: string;
  userId: string;
  visibility: VisibilityType;
  createdAt: string;
  updatedAt?: string;
  context?: unknown;
}

export interface CachedMessage {
  id: string;
  chatId: string;
  role: RoleType;
  parts: unknown;
  attachments?: unknown;
  createdAt: string;
}

export interface CachedChat {
  meta: CachedChatMeta;
  messages: CachedMessage[];
}

export interface CachedDocument {
  id: string;
  title: string;
  content?: string;
  kind: ArtifactKind;
  createdAt: string;
  updatedAt?: string;
}

export interface CacheOptions {
  ttl?: number;
  skipExistenceCheck?: boolean;
}

export const TTL = {
  QUOTA: 25 * 60 * 60, // 25 hours
  GUEST: 24 * 60 * 60, // 24 hours
  DOCUMENT: 7 * 24 * 60 * 60, // 7 days
} as const;
