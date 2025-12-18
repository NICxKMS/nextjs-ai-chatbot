import "server-only";

import { withCircuitBreaker } from "../circuit-breaker";
import { getRedisClient } from "../client";
import { getChatKeys, getMessageScore, getUserChatsScore } from "../keys";
import type { CachedMessage, UserChatListItem } from "../types";

/**
 * Append a single message to cache.
 *
 * @param message - Message to append
 * @param userId - User ID (for IDOR protection)
 * @param chatTitle - Optional chat title for user list update
 * @returns true if appended successfully, false otherwise
 */
export async function appendMessageToCache(
    message: CachedMessage,
    userId: string,
    chatTitle?: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
        return false;
    }

    return await withCircuitBreaker("appendMessageToCache", false, async () => {
        const { msgsKey, userChatsKey } = getChatKeys(message.chatId, userId);

        const score = getMessageScore(message.createdAt, message.role);

        const pipeline = redis.pipeline();
        pipeline.zadd(msgsKey, { score, member: message });

        // Update user's chat list with new timestamp if title provided
        if (chatTitle) {
            const userChatItem: UserChatListItem = {
                chatId: message.chatId,
                title: chatTitle,
                updatedAt: getUserChatsScore(message.createdAt),
            };
            pipeline.zadd(userChatsKey, {
                score: userChatItem.updatedAt,
                member: userChatItem,
            });
        }

        await pipeline.exec();
        return true;
    });
}

/**
 * Append multiple messages to cache atomically.
 *
 * @param messages - Messages to append (must all be for same chat)
 * @param userId - User ID (for IDOR protection)
 * @param chatTitle - Optional chat title for user list update
 * @returns true if all appended successfully, false otherwise
 */
export async function appendMessagesToCache(
    messages: CachedMessage[],
    userId: string,
    chatTitle?: string
): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis || messages.length === 0) {
        return false;
    }

    return await withCircuitBreaker(
        "appendMessagesToCache",
        false,
        async () => {
            // All messages must be for the same chat
            const chatId = messages[0].chatId;
            const { msgsKey, userChatsKey } = getChatKeys(chatId, userId);

            const pipeline = redis.pipeline();

            // Add all messages with scores
            for (const msg of messages) {
                if (msg.chatId !== chatId) {
                    throw new Error(
                        "All messages must belong to the same chat"
                    );
                }
                const score = getMessageScore(msg.createdAt, msg.role);
                pipeline.zadd(msgsKey, { score, member: msg });
            }

            // Update user's chat list with latest timestamp if title provided
            if (chatTitle) {
                const lastMessage = messages.at(-1);
                const userChatItem: UserChatListItem = {
                    chatId,
                    title: chatTitle,
                    updatedAt: getUserChatsScore(lastMessage.createdAt),
                };
                pipeline.zadd(userChatsKey, {
                    score: userChatItem.updatedAt,
                    member: userChatItem,
                });
            }

            await pipeline.exec();
            return true;
        }
    );
}
