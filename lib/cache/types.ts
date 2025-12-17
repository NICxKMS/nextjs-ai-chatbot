import type { ArtifactKind } from "@/lib/artifacts/types";
import type { VisibilityType } from "@/components/visibility-selector";
import type { AppUsage } from "../usage";

// Re-export types needed by cache consumers
export type {
    MessageAttachment,
    MessagePart,
} from "../types/message-parts";

// Import for local use
import type { MessageAttachment, MessagePart } from "../types/message-parts";

/**
 * =============================================================================
 * REDIS SORTED SET (ZSET) CACHE STRUCTURE
 * =============================================================================
 *
 * Chat data is split into two keys for efficient operations:
 *
 * 1. chat:{chatId}:{userId}:meta  → String (chat metadata as JSON)
 * 2. chat:{chatId}:{userId}:msgs  → Sorted Set (messages with timestamp scores)
 *
 * Benefits of ZSET for messages:
 * - O(log N) message append via ZADD
 * - O(log N + M) range deletion via ZREMRANGEBYSCORE (vs O(N) List filter)
 * - O(log N + M) range queries via ZRANGEBYSCORE
 * - Natural time-based ordering
 * - No blocking Lua iteration needed for deletions
 */

// Chat metadata stored as JSON string (without messages)
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

// Full chat structure (for API compatibility with existing code)
// This is assembled from meta + messages list
export type CachedChat = CachedChatMeta & {
    messages: CachedMessage[];
};

export type CachedMessage = {
    id: string;
    chatId: string;
    role: "user" | "assistant" | "system";
    parts: MessagePart[]; // JSON parts array - validated at parse time
    attachments: MessageAttachment[]; // JSON attachments
    createdAt: string; // ISO string
};

// User chat list item for ZSET
export type UserChatListItem = {
    chatId: string;
    title: string;
    updatedAt: number; // Unix timestamp in ms (for ZSET score)
};

// Document with versions array
export type CachedDocument = {
    id: string;
    userId: string;
    chatId: string;
    versions: DocumentVersion[];
};

export type DocumentVersion = {
    title: string;
    content: string | null;
    kind: ArtifactKind;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
};

// Cache key patterns
export const CacheKeys = {
    // chat:{chatId}:{userId}:meta - Chat metadata (String/JSON)
    chatMeta: (chatId: string, userId: string) =>
        `chat:${chatId}:${userId}:meta`,

    // chat:{chatId}:{userId}:msgs - Messages (Sorted Set with timestamp scores)
    chatMessages: (chatId: string, userId: string) =>
        `chat:${chatId}:${userId}:msgs`,

    // user:{userId}:chats - ZSET of chat IDs sorted by updatedAt
    userChats: (userId: string) => `user:${userId}:chats`,

    // document:{documentId}:{userId} - Document with all versions
    document: (documentId: string, userId: string) =>
        `document:${documentId}:${userId}`,
} as const;
