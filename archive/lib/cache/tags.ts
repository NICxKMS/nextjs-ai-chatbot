/**
 * Cache Tags Utility
 *
 * Centralized cache tag generators for Next.js 16.1.0 tag-based invalidation.
 * Used with updateTag() in Server Actions and revalidateTag() in Route Handlers.
 *
 * @module lib/cache/tags
 *
 * @example
 * ```ts
 * import { CacheTags } from '@/lib/cache/tags';
 * import { updateTag, revalidateTag } from 'next/cache';
 *
 * // In Server Action - use updateTag for read-your-writes consistency
 * updateTag(CacheTags.chat(chatId));
 * updateTag(CacheTags.userChats(userId));
 *
 * // In Route Handler - use revalidateTag with profile (Next.js 16.1.0 breaking change)
 * // Profile must match cacheLife profile from next.config.ts
 * revalidateTag(CacheTags.chat(chatId), 'chatMessages');
 * revalidateTag(CacheTags.userChats(userId), 'userChats');
 * revalidateTag(CacheTags.document(documentId), 'documents');
 * revalidateTag(CacheTags.suggestions(documentId), 'suggestions');
 * ```
 */

/**
 * Cache tag generators for consistent tag naming
 *
 * Naming convention: {entity}-{id} or {scope}-{entity}-{id}
 */
export const CacheTags = {
    /**
     * Chat-specific cache tag
     * Invalidates: chat metadata, messages, visibility
     * @param chatId - Chat session identifier
     */
    chat: (chatId: string) => `chat-${chatId}` as const,

    /**
     * Chat messages cache tag
     * Invalidates: message list for a specific chat
     * @param chatId - Chat session identifier
     */
    chatMessages: (chatId: string) => `chat-messages-${chatId}` as const,

    /**
     * User's chat list cache tag
     * Invalidates: sidebar chat list for a user
     * @param userId - User identifier
     */
    userChats: (userId: string) => `user-chats-${userId}` as const,

    /**
     * Document cache tag
     * Invalidates: document metadata and content
     * @param documentId - Document identifier
     */
    document: (documentId: string) => `document-${documentId}` as const,

    /**
     * User's documents list cache tag
     * Invalidates: document list for a user
     * @param userId - User identifier
     */
    userDocuments: (userId: string) => `user-documents-${userId}` as const,

    /**
     * Suggestions cache tag
     * Invalidates: suggestions for a document
     * @param documentId - Document identifier
     * @param userId - User identifier (optional, for user-specific suggestions)
     */
    suggestions: (documentId: string, userId?: string) =>
        userId
            ? (`suggestions-${documentId}-${userId}` as const)
            : (`suggestions-${documentId}` as const),

    /**
     * Votes cache tag
     * Invalidates: vote data for a chat/message
     * @param chatId - Chat session identifier
     */
    votes: (chatId: string) => `votes-${chatId}` as const,

    /**
     * User session cache tag
     * Invalidates: session data for a user
     * @param userId - User identifier
     */
    session: (userId: string) => `session-${userId}` as const,
} as const;

/**
 * Type for cache tag values
 */
export type CacheTagValue = ReturnType<
    (typeof CacheTags)[keyof typeof CacheTags]
>;
