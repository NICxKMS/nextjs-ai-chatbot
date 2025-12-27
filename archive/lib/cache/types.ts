/**
 * Cache Types
 * Ref: 04-cache-layer-optimal-design.md §3
 *
 * Extracted from OldApp: oldapp/lib/cache/types.ts
 */

import type { Visibility } from "@/lib/db";

/**
 * Cached chat metadata
 */
export type CachedChatMeta = {
    id: string;
    userId: string;
    title: string;
    visibility: Visibility;
    createdAt: number; // Unix timestamp
    updatedAt: number; // Unix timestamp
    lastContext?: Record<string, unknown>;
    version: number;
};

/**
 * Cached message
 */
export type CachedMessage = {
    id: string;
    chatId: string;
    role: "user" | "assistant" | "system";
    parts: unknown[];
    attachments?: unknown[];
    createdAt: number; // Unix timestamp
};

/**
 * Full cached chat (metadata + messages)
 */
export type CachedChat = {
    meta: CachedChatMeta;
    messages: CachedMessage[];
};

/**
 * User chat list item
 */
export type CachedUserChatItem = {
    chatId: string;
    title: string;
    updatedAt: number;
};

/**
 * Cached document
 */
export type CachedDocument = {
    id: string;
    userId: string;
    chatId?: string;
    versions: CachedDocumentVersion[];
};

/**
 * Cached document version
 */
export type CachedDocumentVersion = {
    title: string;
    content: string | null;
    kind: "text" | "code" | "image" | "sheet";
    createdAt: number;
    updatedAt: number;
};

/**
 * Circuit breaker state
 */
export type CircuitBreakerState = {
    failures: number;
    lastFailure: number | null;
    isOpen: boolean;
};

/**
 * Cache operation options
 */
export type CacheOptions = {
    /** TTL in seconds (undefined = no expiry) */
    ttl?: number;
    /** Skip cache if circuit breaker is open */
    skipOnCircuitOpen?: boolean;
};

/**
 * Document ZSET Hybrid - Metadata only (separate from versions)
 * Ref: FINAL-CACHE-DESIGN.md §2
 */
export type CachedDocumentMeta = {
    id: string;
    userId: string;
    chatId: string;
    kind: string; // 'text' | 'code' | etc.
    title: string;
    createdAt: number; // Unix timestamp (milliseconds)
    updatedAt: number; // Unix timestamp (milliseconds)
};

/**
 * Cached session
 */
export type CachedSession = {
    userId: string;
    isGuest: boolean;
    createdAt: string;
    expiresAt: string;
    metadata?: Record<string, unknown>;
};

/**
 * Cached quota
 */
export type CachedQuota = {
    count: number;
    limit: number;
    resetAt: string;
};

/**
 * User context for cache operations
 */
export type UserContext = {
    userId: string;
    isGuest: boolean;
};
