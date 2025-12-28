import "server-only";

import {
    getZScoreWithRoleOffset,
    sortMessagesByTimeAndRole,
} from "../constants";
import type { DBMessage } from "../db/schema";
import type {
    CachedMessage,
    CacheKeys,
    MessageAttachment,
    MessagePart,
} from "./types";

/**
 * Convert a database message to cached message format
 * Centralizes the conversion logic to avoid duplication
 *
 * @param msg Database message
 * @returns Cached message format
 */
export function dbMessageToCachedMessage(msg: DBMessage): CachedMessage {
    // Ensure attachments is an array (jsonb column can be object or array)
    let attachments: MessageAttachment[];
    if (Array.isArray(msg.attachments)) {
        attachments = msg.attachments as MessageAttachment[];
    } else if (msg.attachments && typeof msg.attachments === "object") {
        attachments = [msg.attachments as MessageAttachment];
    } else {
        attachments = [];
    }

    return {
        id: msg.id || "",
        chatId: msg.chatId,
        role: msg.role,
        parts: msg.parts as MessagePart[],
        attachments,
        createdAt: msg.createdAt
            ? msg.createdAt.toISOString()
            : new Date().toISOString(),
    };
}

/**
 * Convert multiple database messages to cached format
 *
 * @param messages Array of database messages
 * @returns Array of cached messages
 */
export function dbMessagesToCachedMessages(
    messages: DBMessage[]
): CachedMessage[] {
    return messages.map(dbMessageToCachedMessage);
}

/**
 * Group messages by chat ID for batch operations
 *
 * @param messages Array of database messages
 * @returns Map of chatId to cached messages array
 */
export function groupMessagesByChatId(
    messages: DBMessage[]
): Map<string, CachedMessage[]> {
    const messagesByChatId = new Map<string, CachedMessage[]>();

    for (const msg of messages) {
        if (!msg.chatId) {
            continue;
        }

        const cachedMsg = dbMessageToCachedMessage(msg);

        if (!messagesByChatId.has(msg.chatId)) {
            messagesByChatId.set(msg.chatId, []);
        }

        const chatMessages = messagesByChatId.get(msg.chatId);
        if (chatMessages) {
            chatMessages.push(cachedMsg);
        }
    }

    return messagesByChatId;
}

/**
 * =============================================================================
 * CACHE KEY HELPERS
 * =============================================================================
 */

/**
 * Get all cache keys for a chat in one call
 * Reduces repetitive key construction across operations
 *
 * @param chatId Chat UUID
 * @param userId User ID
 * @param cacheKeys CacheKeys object (passed to avoid circular dependency)
 * @returns Object with metaKey, msgsKey, and userChatsKey
 */
export function getChatCacheKeys(
    chatId: string,
    userId: string,
    cacheKeys: typeof CacheKeys
): { metaKey: string; msgsKey: string; userChatsKey: string } {
    return {
        metaKey: cacheKeys.chatMeta(chatId, userId),
        msgsKey: cacheKeys.chatMessages(chatId, userId),
        userChatsKey: cacheKeys.userChats(userId),
    };
}

/**
 * =============================================================================
 * MESSAGE SCORE HELPERS
 * =============================================================================
 */

/**
 * Get timestamp score for a message for ZSET storage
 * Uses role-based microsecond offset for deterministic ordering
 *
 * This is the single source of truth for message scoring.
 * Uses shared getZScoreWithRoleOffset from constants.ts.
 *
 * @param message Cached message
 * @returns Score for ZSET (timestamp with role offset)
 */
export function getMessageScore(message: CachedMessage): number {
    return getZScoreWithRoleOffset(new Date(message.createdAt), message.role);
}

/**
 * =============================================================================
 * MESSAGE PARSING HELPERS
 * =============================================================================
 */

/**
 * Parse raw message strings from Redis ZSET into CachedMessage objects
 * ZSET returns members as strings (the JSON we stored)
 *
 * Uses sortMessagesByTimeAndRole from constants.ts for consistent sorting.
 *
 * @param messagesRaw Raw messages from Redis ZRANGE
 * @returns Parsed and sorted CachedMessage array
 */
export function parseMessagesFromRaw(messagesRaw: unknown[]): CachedMessage[] {
    const messages = (messagesRaw || []).map((msgStr) => {
        if (typeof msgStr === "string") {
            return JSON.parse(msgStr) as CachedMessage;
        }
        return msgStr as CachedMessage;
    });

    // Use shared sorting helper for consistent ordering
    return sortMessagesByTimeAndRole(
        messages.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt, // Already string, sortMessagesByTimeAndRole handles both
        }))
    );
}

/**
 * =============================================================================
 * GUEST USER HELPERS
 * =============================================================================
 */

/**
 * Check if a user ID represents a guest user
 * Single source of truth for guest detection by user ID string
 *
 * @param userId User ID string
 * @returns true if guest user
 */
export function isGuestUserId(userId: string): boolean {
    return userId.startsWith("guest:");
}
