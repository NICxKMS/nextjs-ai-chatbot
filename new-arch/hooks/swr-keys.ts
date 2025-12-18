"use client";

/**
 * Centralized SWR cache keys for consistent cache management.
 *
 * Naming Convention:
 * - Server state: `prefix:resource` or function returning URL
 * - Local cache: `local:resource` (no fetcher, used as reactive store)
 * - Parameterized: Function returning key string
 */
export const SWR_KEYS = {
    // ─────────────────────────────────────────────────────────────
    // Chat History (Server State)
    // ─────────────────────────────────────────────────────────────
    /**
     * Paginated chat history endpoint.
     * @param cursor - Optional cursor for pagination (ending_before)
     */
    chatHistory: (cursor?: string) =>
        cursor
            ? `/api/history?ending_before=${cursor}&limit=20`
            : "/api/history?limit=20",

    /**
     * Chat visibility state per chat.
     * @param chatId - The chat ID
     */
    chatVisibility: (chatId: string) => `chat:${chatId}:visibility` as const,

    // ─────────────────────────────────────────────────────────────
    // Optimistic Chats (Local Cache)
    // ─────────────────────────────────────────────────────────────
    /** Optimistic chat entries pending server confirmation */
    optimisticChats: "local:optimistic-chats" as const,

    // ─────────────────────────────────────────────────────────────
    // Messages (Server + Streaming State)
    // ─────────────────────────────────────────────────────────────
    /**
     * Messages for a specific chat.
     * @param chatId - The chat ID
     */
    messages: (chatId: string) => `messages:${chatId}` as const,

    /**
     * Streaming state for a chat.
     * @param chatId - The chat ID
     */
    messageStream: (chatId: string) => `stream:${chatId}` as const,

    // ─────────────────────────────────────────────────────────────
    // Artifact (Local Cache)
    // ─────────────────────────────────────────────────────────────
    /** Current artifact UI state */
    artifact: "local:artifact" as const,

    /**
     * Artifact metadata per document.
     * @param documentId - The document ID
     */
    artifactMetadata: (documentId: string) =>
        `local:artifact-metadata:${documentId}` as const,

    // ─────────────────────────────────────────────────────────────
    // UI State (Local Cache)
    // ─────────────────────────────────────────────────────────────
    /** Scroll behavior preferences */
    scrollBehavior: "local:scroll-behavior" as const,

    /** Sidebar open/closed state */
    sidebarState: "local:sidebar-state" as const,
} as const;

/**
 * Type-safe key extraction for SWR cache operations.
 */
export type SWRKeyType = typeof SWR_KEYS;

/**
 * Helper to check if a key matches a pattern (for cache invalidation).
 * @param key - The SWR cache key to check
 * @param prefix - The prefix pattern to match
 */
export function matchesKeyPattern(key: unknown, prefix: string): boolean {
    return typeof key === "string" && key.startsWith(prefix);
}

/**
 * Invalidation patterns for bulk cache operations.
 */
export const INVALIDATION_PATTERNS = {
    /** All chat history pages */
    allChatHistory: "/api/history",
    /** All chat visibility entries */
    allChatVisibility: "chat:",
    /** All message entries */
    allMessages: "messages:",
    /** All artifact metadata */
    allArtifactMetadata: "local:artifact-metadata:",
} as const;
