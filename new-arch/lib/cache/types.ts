import "server-only";

import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import type { MessageAttachment, MessagePart } from "@/lib/types/message-parts";
import type { AppUsage } from "@/lib/usage";

// Re-export types for consumers
export type { MessageAttachment, MessagePart } from "@/lib/types/message-parts";

/**
 * =============================================================================
 * CACHE DATA STRUCTURES
 * =============================================================================
 *
 * Chat data is split into two Redis keys for efficient operations:
 *
 * 1. chat:{chatId}:{userId}:meta  → String (chat metadata as JSON)
 * 2. chat:{chatId}:{userId}:msgs  → Sorted Set (messages with timestamp scores)
 *
 * Benefits of ZSET for messages:
 * - O(log N) message append via ZADD
 * - O(log N + M) range deletion via ZREMRANGEBYSCORE
 * - O(log N + M) range queries via ZRANGEBYSCORE
 * - Natural time-based ordering
 */

// -----------------------------------------------------------------------------
// Cache Configuration
// -----------------------------------------------------------------------------

export type CacheConfig = {
    /** Circuit breaker failure threshold before opening */
    circuitBreakerThreshold: number;
    /** Circuit breaker reset time in milliseconds */
    circuitBreakerResetMs: number;
    /** Default TTL for guest user data in seconds */
    guestTtlSeconds: number;
    /** Maximum messages to fetch in a single read */
    maxMessagesPerRead: number;
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 30_000,
    guestTtlSeconds: 86_400, // 24 hours
    maxMessagesPerRead: 100,
} as const;

// -----------------------------------------------------------------------------
// Chat Cache Types
// -----------------------------------------------------------------------------

/**
 * Chat metadata stored as JSON string (without messages).
 * Stored in Redis STRING at key: chat:{chatId}:{userId}:meta
 */
export type CachedChatMeta = {
    id: string;
    userId: string;
    title: string;
    visibility: VisibilityType;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    lastContext: AppUsage | null;
    version: number;
};

/**
 * Full chat structure (metadata + messages).
 * Assembled from meta STRING + messages ZSET.
 */
export type CachedChat = CachedChatMeta & {
    messages: CachedMessage[];
};

/**
 * Individual message stored in Redis ZSET.
 * Score = timestamp with role-based offset for ordering.
 */
export type CachedMessage = {
    id: string;
    chatId: string;
    role: "user" | "assistant" | "system";
    parts: MessagePart[];
    attachments: MessageAttachment[];
    createdAt: string; // ISO string
};

/**
 * User chat list item for ZSET aggregation.
 * Stored in ZSET at key: user:{userId}:chats
 */
export type UserChatListItem = {
    chatId: string;
    title: string;
    updatedAt: number; // Unix timestamp in ms (ZSET score)
};

// -----------------------------------------------------------------------------
// Document Cache Types
// -----------------------------------------------------------------------------

/**
 * Document with all versions.
 * Stored in Redis STRING at key: document:{documentId}:{userId}
 */
export type CachedDocument = {
    id: string;
    userId: string;
    chatId: string;
    versions: DocumentVersion[];
};

/**
 * Single document version.
 */
export type DocumentVersion = {
    title: string;
    content: string | null;
    kind: ArtifactKind;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
};

// -----------------------------------------------------------------------------
// Operation Result Types
// -----------------------------------------------------------------------------

export type CacheOperationResult<T = void> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type CacheWriteResult = {
    written: boolean;
    version?: number;
};
