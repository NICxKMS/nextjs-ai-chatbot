import "server-only";

import {
    and,
    asc,
    desc,
    eq,
    gt,
    gte,
    inArray,
    lt,
    type SQL,
} from "drizzle-orm";
import type { VisibilityType } from "@/components/visibility-selector";
import { MAX_MESSAGES_LIMIT, sortMessagesByTimeAndRole } from "@/lib/constants";
import { logError, logWarn } from "@/lib/log";
import {
    batchUpdateChatCache,
    createOrUpdateChatWithMessages,
} from "../cache/batch-operations";
import { dbMessageToCachedMessage } from "../cache/helpers";
import {
    appendMessagesToCache,
    chatToCache,
    deleteAllChatsFromCache,
    deleteChatFromCache,
    deleteMessagesFromCacheAfterTimestamp,
    getChatFromCache,
    getUserChatsFromCache,
    setChatInCache,
    updateChatLastContextInCache,
    updateChatTitleInCache,
    updateChatVisibilityInCache,
    warmChatCache,
} from "../cache/operations";
import { incrementUserMessageCountAsync } from "../cache/quota";
import { getRedisClient, isRedisAvailable } from "../cache/redis";
import type { CachedChatMeta, CachedMessage } from "../cache/types";
import { CacheKeys } from "../cache/types";
import { db } from "../db/queries";
import type { Chat, DBMessage, MessageRow } from "../db/schema";
import { chat, message, vote } from "../db/schema";
import { ChatSDKError, toDatabaseError } from "../errors";
import type { AppUsage } from "../usage";
import type {
    ChatWithMessages,
    DataContext,
    PaginatedResult,
    PaginationParams,
} from "./base";

/**
 * ==============================================================================
 * CHAT DATA ACCESS LAYER
 * ==============================================================================
 *
 * Unified chat operations with cache-first strategy.
 * Automatically handles guest (cache-only) vs authenticated (cache+DB) flows.
 *
 * Key principles:
 * - Cache checked FIRST for all operations (guest and auth)
 * - Cache miss for guests ÔåÆ return null (no DB call, no empty cache write)
 * - Cache miss for auth ÔåÆ single DB query, warm cache in background
 * - Write operations: cache always updated, DB write only for auth users
 * - Zero extra DB/cache calls compared to original implementation
 */

/**
 * Chat data access methods
 */
export const chatData = {
    /**
     * Get chat by ID (cache-first)
     *
     * Flow:
     * 1. Check cache (for both guest and auth users)
     * 2. Cache hit ÔåÆ return chat metadata
     * 3. Cache miss + guest ÔåÆ return null (NO DB call)
     * 4. Cache miss + auth ÔåÆ query DB, warm cache in background, return
     *
     * @param chatId Chat UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Chat metadata or null if not found
     */
    get: async (
        chatId: string,
        ctx: DataContext,
        opts?: { warmCache?: boolean }
    ): Promise<Chat | null> => {
        try {
            // Task 9.10: Try cache first with error recovery
            // If cache fails, fall back to DB-only operation for auth users
            if (isRedisAvailable()) {
                try {
                    const cached = await getChatFromCache(chatId, ctx.userId);
                    if (cached) {
                        // Return chat metadata (without messages)
                        return {
                            id: cached.id,
                            userId: cached.userId,
                            title: cached.title,
                            visibility: cached.visibility,
                            createdAt: new Date(cached.createdAt),
                            updatedAt: new Date(cached.updatedAt),
                            lastContext: cached.lastContext,
                        } as Chat;
                    }
                } catch (cacheError) {
                    // Task 9.10: Log cache error and fall through to DB for auth users
                    logWarn("Cache read failed, falling back to DB", {
                        chatId,
                        error: cacheError,
                    });
                    // For guests, cache is the only source - return null
                    if (ctx.isGuest) {
                        return null;
                    }
                    // For auth users, continue to DB fallback below
                }
            }

            // Guest users: cache-only, return null if not in cache
            if (ctx.isGuest) {
                return null;
            }

            // Authenticated users: cache miss - fetch from database
            // SECURITY: Filter by userId to prevent unauthorized access (IDOR protection)
            const [chatFromDb] = await db
                .select()
                .from(chat)
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

            if (!chatFromDb) {
                return null;
            }

            // Warm cache in background if enabled
            // Note: userId check already done in query, so we can warm cache directly
            const shouldWarmCache = opts?.warmCache ?? true;
            if (isRedisAvailable() && shouldWarmCache) {
                // Fetch messages for cache warming (don't block)
                // Note: Both DB fetch and warmChatCache errors are caught
                db.select()
                    .from(message)
                    .where(eq(message.chatId, chatId))
                    .orderBy(asc(message.createdAt))
                    .then((messages) =>
                        warmChatCache(
                            chatId,
                            ctx.userId,
                            chatFromDb,
                            messages as DBMessage[]
                        ).catch((err) => logError("Cache warming failed", err))
                    )
                    .catch((err) =>
                        logError("Cache warming DB fetch failed", err)
                    );
            }

            return chatFromDb;
        } catch (error) {
            throw toDatabaseError(
                "get_chat_by_id",
                error,
                "Failed to get chat by id"
            );
        }
    },

    /**
     * Get chat with messages in single operation (optimized)
     *
     * Eliminates duplicate Redis GET requests by returning both chat metadata
     * and messages from the denormalized cache structure in one fetch.
     *
     * Flow:
     * 1. Check cache (single GET returns chat + messages)
     * 2. Cache hit ÔåÆ return both chat and messages
     * 3. Cache miss + guest ÔåÆ return null (NO DB call)
     * 4. Cache miss + auth ÔåÆ query DB (chat + messages), warm cache, return
     *
     * @param chatId Chat UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Chat with messages or null if not found
     */
    getWithMessages: async (
        chatId: string,
        ctx: DataContext
    ): Promise<ChatWithMessages | null> => {
        try {
            // Task 9.10: Try cache first with error recovery
            // If cache fails, fall back to DB-only operation for auth users
            if (isRedisAvailable()) {
                try {
                    const cached = await getChatFromCache(chatId, ctx.userId);
                    if (cached) {
                        // Return BOTH chat metadata AND messages from single fetch
                        const chatMeta = {
                            id: cached.id,
                            userId: cached.userId,
                            title: cached.title,
                            visibility: cached.visibility,
                            createdAt: new Date(cached.createdAt),
                            updatedAt: new Date(cached.updatedAt),
                            lastContext: cached.lastContext,
                        } as Chat;

                        // Deduplicate messages by ID to prevent React duplicate key errors
                        // (can occur due to race conditions, retries, or concurrent cache warming)
                        const uniqueMessages = Array.from(
                            new Map(
                                cached.messages.map((msg) => [msg.id, msg])
                            ).values()
                        );

                        // Sort messages using shared helper (timestamp + role tiebreaker)
                        const sortedMessages = sortMessagesByTimeAndRole(
                            uniqueMessages.map((msg) => ({
                                ...msg,
                                createdAt: new Date(msg.createdAt),
                            }))
                        );

                        // Apply safety limit to prevent memory issues
                        if (sortedMessages.length > MAX_MESSAGES_LIMIT) {
                            logWarn("Message limit exceeded, truncating", {
                                chatId,
                                totalMessages: sortedMessages.length,
                                limit: MAX_MESSAGES_LIMIT,
                            });
                        }
                        const limitedMessages = sortedMessages.slice(
                            -MAX_MESSAGES_LIMIT
                        );

                        const messagesData = limitedMessages.map((msg) => ({
                            id: msg.id,
                            chatId: msg.chatId,
                            role: msg.role,
                            parts: msg.parts,
                            attachments: msg.attachments,
                            createdAt: msg.createdAt,
                        })) as MessageRow[];

                        return {
                            chat: chatMeta,
                            messages: messagesData,
                        };
                    }
                } catch (cacheError) {
                    // Task 9.10: Log cache error and fall through to DB for auth users
                    logWarn(
                        "Cache read failed in getWithMessages, falling back to DB",
                        {
                            chatId,
                            error: cacheError,
                        }
                    );
                    // For guests, cache is the only source - return null
                    if (ctx.isGuest) {
                        return null;
                    }
                    // For auth users, continue to DB fallback below
                }
            }

            // Guest users: cache-only, return null if not in cache
            if (ctx.isGuest) {
                return null;
            }

            // Authenticated users: cache miss - fetch from database
            // SECURITY: Filter by userId to prevent unauthorized access (IDOR protection)
            const [chatFromDb] = await db
                .select()
                .from(chat)
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

            if (!chatFromDb) {
                return null;
            }

            // Fetch messages from database
            const messagesFromDb = await db
                .select()
                .from(message)
                .where(eq(message.chatId, chatId))
                .orderBy(asc(message.createdAt));

            // Warm cache in background (fire-and-forget with error logging)
            // Note: This is intentionally non-blocking; cache warming failures don't affect the response
            // Note: userId check already done in query, so we can warm cache directly
            if (isRedisAvailable()) {
                warmChatCache(
                    chatId,
                    ctx.userId,
                    chatFromDb,
                    messagesFromDb as DBMessage[]
                ).catch((err) =>
                    logError("Background cache warming failed", err, { chatId })
                );
            }

            // Sort messages using shared helper and apply safety limit
            const sortedMessages = sortMessagesByTimeAndRole(messagesFromDb);
            if (sortedMessages.length > MAX_MESSAGES_LIMIT) {
                logWarn("Message limit exceeded in DB fetch, truncating", {
                    chatId,
                    totalMessages: sortedMessages.length,
                    limit: MAX_MESSAGES_LIMIT,
                });
            }

            return {
                chat: chatFromDb,
                messages: sortedMessages.slice(-MAX_MESSAGES_LIMIT),
            };
        } catch (error) {
            throw toDatabaseError(
                "get_chat_with_messages_by_id",
                error,
                "Failed to get chat with messages by id"
            );
        }
    },

    /**
     * Get paginated list of user's chats
     *
     * Flow:
     * - Guest users: fetch from cache ZSET + batch MGET
     * - Auth users: query DB with pagination
     *
     * @param pagination Pagination parameters
     * @param ctx Data context (userId, isGuest)
     * @returns Paginated list of chats
     */
    list: async (
        pagination: PaginationParams,
        ctx: DataContext
    ): Promise<PaginatedResult<Chat>> => {
        try {
            const { limit, startingAfter, endingBefore } = pagination;

            // Guest users: cache-only
            if (ctx.isGuest) {
                const extendedLimit = limit + 1;
                const offset = 0;

                const chatList = await getUserChatsFromCache(
                    ctx.userId,
                    extendedLimit,
                    offset
                );

                // OPTIMIZATION: Batch fetch with MGET instead of N+1 pattern
                const redis = getRedisClient();
                if (!redis || chatList.length === 0) {
                    return { items: [], hasMore: false };
                }

                const cacheKeys = chatList.map((item) =>
                    CacheKeys.chatMeta(item.chatId, ctx.userId)
                );
                const cachedChats = await redis.mget<(CachedChatMeta | null)[]>(
                    ...cacheKeys
                );

                // Convert to full chat objects
                const chats = cachedChats
                    .map((cached) => {
                        if (!cached) {
                            return null;
                        }

                        return {
                            id: cached.id,
                            userId: cached.userId,
                            title: cached.title,
                            visibility: cached.visibility,
                            createdAt: new Date(cached.createdAt),
                            updatedAt: new Date(cached.updatedAt),
                            lastContext: cached.lastContext,
                        };
                    })
                    .filter((c): c is Chat => c !== null);

                const hasMore = chats.length > limit;

                return {
                    items: hasMore ? chats.slice(0, limit) : chats,
                    hasMore,
                };
            }

            // Authenticated users: DB query with pagination
            const extendedLimit = limit + 1;

            const query = (whereCondition?: SQL<unknown>) =>
                db
                    .select()
                    .from(chat)
                    .where(
                        whereCondition
                            ? and(whereCondition, eq(chat.userId, ctx.userId))
                            : eq(chat.userId, ctx.userId)
                    )
                    .orderBy(desc(chat.createdAt))
                    .limit(extendedLimit);

            let filteredChats: Chat[] = [];

            if (startingAfter) {
                const [selectedChat] = await db
                    .select()
                    .from(chat)
                    .where(eq(chat.id, startingAfter))
                    .limit(1);

                if (!selectedChat) {
                    throw new ChatSDKError(
                        "not_found:database",
                        `Chat with id ${startingAfter} not found`
                    );
                }

                filteredChats = await query(
                    gt(chat.createdAt, selectedChat.createdAt)
                );
            } else if (endingBefore) {
                const [selectedChat] = await db
                    .select()
                    .from(chat)
                    .where(eq(chat.id, endingBefore))
                    .limit(1);

                if (!selectedChat) {
                    throw new ChatSDKError(
                        "not_found:database",
                        `Chat with id ${endingBefore} not found`
                    );
                }

                filteredChats = await query(
                    lt(chat.createdAt, selectedChat.createdAt)
                );
            } else {
                filteredChats = await query();
            }

            const hasMore = filteredChats.length > limit;

            return {
                items: hasMore ? filteredChats.slice(0, limit) : filteredChats,
                hasMore,
            };
        } catch (error) {
            throw toDatabaseError(
                "get_chats_by_user_id",
                error,
                "Failed to get chats by user id"
            );
        }
    },

    /**
     * Create a new chat
     *
     * Flow:
     * - Guest users: write to cache only
     * - Auth users: DB-first approach (write to DB, then cache on success)
     *
     * @param params Chat creation parameters
     * @param ctx Data context (userId, isGuest)
     * @returns Created chat
     */
    create: async (
        params: {
            id: string;
            title: string;
            visibility: VisibilityType;
            skipCache?: boolean;
        },
        ctx: DataContext
    ): Promise<Chat> => {
        try {
            const { id, title, visibility, skipCache = false } = params;
            const now = new Date();
            const newChat = {
                id,
                createdAt: now,
                userId: ctx.userId,
                title,
                visibility,
                updatedAt: now,
                lastContext: null,
            };

            if (ctx.isGuest) {
                // Guest users: cache-only, no database write
                await setChatInCache(
                    id,
                    ctx.userId,
                    chatToCache(newChat as Chat, [])
                );
                return newChat as Chat;
            }

            // Authenticated users: DB-FIRST approach to prevent cache/DB inconsistency
            // Write to database first (source of truth)
            await db.insert(chat).values(newChat);

            // Cache update AFTER DB success (fire-and-forget for performance)
            // If cache fails, it will be warmed on next read
            if (!skipCache && isRedisAvailable()) {
                setChatInCache(
                    id,
                    ctx.userId,
                    chatToCache(newChat as Chat, [])
                ).catch((err) =>
                    logError("Cache update failed after chat creation", err, {
                        chatId: id,
                        err,
                    })
                );
            }

            return newChat as Chat;
        } catch (error) {
            // If the user doesn't exist, inserting a chat will violate the FK constraint.
            // Translate that specific failure into a 404 so the client can recover by redirecting.
            const errorCode = (error as { code?: string })?.code;
            if (errorCode === "23503") {
                throw new ChatSDKError("not_found:auth:user", "User not found");
            }
            throw toDatabaseError("save_chat", error, "Failed to save chat");
        }
    },

    /**
     * Delete a chat and all related data
     *
     * Flow:
     * - Guest users: delete from cache only
     * - Auth users: delete from DB (cascade) + cache in parallel
     *
     * @param chatId Chat UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Deleted chat (or null for guests/not found)
     */
    delete: async (chatId: string, ctx: DataContext): Promise<Chat | null> => {
        try {
            if (ctx.isGuest) {
                // Guest users: cache-only deletion
                await deleteChatFromCache(chatId, ctx.userId);
                return null;
            }

            // Authenticated users: use transaction for atomic delete
            // FIX IDOR: Verify ownership by filtering on userId
            const result = await db.transaction(async (tx) => {
                // First verify the chat belongs to this user
                const chatToDelete = await tx
                    .select({ id: chat.id })
                    .from(chat)
                    .where(
                        and(eq(chat.id, chatId), eq(chat.userId, ctx.userId))
                    )
                    .limit(1);

                if (chatToDelete.length === 0) {
                    // Chat doesn't exist or doesn't belong to user - return null
                    return null;
                }

                // Delete votes and messages in parallel (both depend on chat, not each other)
                await Promise.all([
                    tx.delete(vote).where(eq(vote.chatId, chatId)),
                    tx.delete(message).where(eq(message.chatId, chatId)),
                ]);

                // Then delete the chat (must be after votes/messages due to FK)
                const deletedChats = await tx
                    .delete(chat)
                    .where(
                        and(eq(chat.id, chatId), eq(chat.userId, ctx.userId))
                    )
                    .returning();

                return deletedChats[0] ?? null;
            });

            // Delete from cache after DB transaction succeeds
            if (isRedisAvailable()) {
                deleteChatFromCache(chatId, ctx.userId).catch((err) =>
                    logError("Cache delete failed after DB delete", err, {
                        chatId,
                        err,
                    })
                );
            }

            return result;
        } catch (error) {
            throw toDatabaseError(
                "delete_chat_by_id",
                error,
                "Failed to delete chat by id"
            );
        }
    },

    /**
     * Delete all chats for a user
     *
     * @param ctx Data context (userId, isGuest)
     * @returns Number of chats deleted
     */
    deleteAll: async (ctx: DataContext): Promise<{ deletedCount: number }> => {
        try {
            if (ctx.isGuest) {
                // Use atomic Lua script to delete all chats
                // This prevents race conditions where new chats could be created
                // between fetching the list and deleting individual chats
                const deletedCount = await deleteAllChatsFromCache(ctx.userId);
                return { deletedCount };
            }

            // Authenticated users: use transaction for atomic delete
            const deletedCount = await db.transaction(async (tx) => {
                const userChats = await tx
                    .select({ id: chat.id })
                    .from(chat)
                    .where(eq(chat.userId, ctx.userId));

                if (userChats.length === 0) {
                    return 0;
                }

                const chatIds = userChats.map((chatRec) => chatRec.id);

                // Delete votes and messages in parallel within transaction
                await Promise.all([
                    tx.delete(vote).where(inArray(vote.chatId, chatIds)),
                    tx.delete(message).where(inArray(message.chatId, chatIds)),
                ]);

                const deletedChats = await tx
                    .delete(chat)
                    .where(eq(chat.userId, ctx.userId))
                    .returning();

                return deletedChats.length;
            });

            // Clear cache after DB transaction succeeds (fire-and-forget)
            // This ensures consistency even if cache was populated
            if (isRedisAvailable()) {
                deleteAllChatsFromCache(ctx.userId).catch((err) =>
                    logError("Cache cleanup failed after deleteAll", err, {
                        userId: ctx.userId,
                        err,
                    })
                );
            }

            return { deletedCount };
        } catch (error) {
            throw toDatabaseError(
                "delete_all_chats_by_user_id",
                error,
                "Failed to delete all chats by user id"
            );
        }
    },

    /**
     * Update chat title (optimized cache+DB update)
     *
     * @param chatId Chat UUID
     * @param title New title
     * @param ctx Data context (userId, isGuest)
     */
    updateTitle: async (
        chatId: string,
        title: string,
        ctx: DataContext
    ): Promise<void> => {
        try {
            // Guest users: cache-only
            if (ctx.isGuest) {
                if (isRedisAvailable()) {
                    await updateChatTitleInCache(chatId, ctx.userId, title);
                }
                return;
            }

            // Authenticated users: DB-first approach
            // Update database first (source of truth)
            // SECURITY: Filter by userId to prevent IDOR attacks
            await db
                .update(chat)
                .set({ title, updatedAt: new Date() })
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

            // Then update cache (fire-and-forget for performance)
            if (isRedisAvailable()) {
                updateChatTitleInCache(chatId, ctx.userId, title).catch((err) =>
                    logError("Cache title update failed", err, { chatId })
                );
            }
        } catch (error) {
            throw toDatabaseError(
                "update_chat_title",
                error,
                "Failed to update chat title by id"
            );
        }
    },

    /**
     * Update chat visibility
     *
     * @param chatId Chat UUID
     * @param visibility New visibility
     * @param ctx Data context (userId, isGuest)
     */
    updateVisibility: async (
        chatId: string,
        visibility: VisibilityType,
        ctx: DataContext
    ): Promise<void> => {
        try {
            // Guest users: cache-only
            if (ctx.isGuest) {
                if (isRedisAvailable()) {
                    await updateChatVisibilityInCache(
                        chatId,
                        ctx.userId,
                        visibility
                    );
                }
                return;
            }

            // Authenticated users: DB-first approach
            // SECURITY: Filter by userId to prevent IDOR attacks
            await db
                .update(chat)
                .set({ visibility, updatedAt: new Date() })
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

            // Then update cache (fire-and-forget)
            if (isRedisAvailable()) {
                updateChatVisibilityInCache(
                    chatId,
                    ctx.userId,
                    visibility
                ).catch((err) =>
                    logError("Cache visibility update failed", err, { chatId })
                );
            }
        } catch (error) {
            throw toDatabaseError(
                "update_chat_visibility",
                error,
                "Failed to update chat visibility by id"
            );
        }
    },

    /**
     * Update chat context (usage metadata)
     * Note: This is a best-effort operation - failures don't block chat flow
     *
     * @param chatId Chat UUID
     * @param context Usage context
     * @param ctx Data context (userId, isGuest)
     */
    updateContext: async (
        chatId: string,
        context: AppUsage,
        ctx: DataContext
    ): Promise<void> => {
        try {
            // Guest users: cache-only
            if (ctx.isGuest) {
                if (isRedisAvailable()) {
                    await updateChatLastContextInCache(
                        chatId,
                        ctx.userId,
                        context
                    );
                }
                return;
            }

            // Authenticated users: DB-first approach
            // SECURITY: Filter by userId to prevent IDOR attacks
            await db
                .update(chat)
                .set({ lastContext: context, updatedAt: new Date() })
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

            // Then update cache (fire-and-forget)
            if (isRedisAvailable()) {
                updateChatLastContextInCache(chatId, ctx.userId, context).catch(
                    (err) =>
                        logError("Cache context update failed", err, { chatId })
                );
            }
        } catch (error) {
            // Context updates are best-effort for usage tracking
            logWarn("Failed to update lastContext for chat (best-effort)", {
                chatId,
                error,
            });
            // Don't re-throw - this is a non-critical operation
        }
    },
};

/**
 * ==============================================================================
 * MESSAGE DATA ACCESS LAYER
 * ==============================================================================
 */

export const messageData = {
    /**
     * Get all messages for a chat
     *
     * Flow:
     * 1. Check cache (for both guest and auth users)
     * 2. Cache hit ÔåÆ return messages from denormalized structure
     * 3. Cache miss ÔåÆ query DB (auth only)
     *
     * @param chatId Chat UUID
     * @param ctx Data context (userId, isGuest)
     * @returns Array of messages
     */
    getForChat: async (
        chatId: string,
        ctx: DataContext
    ): Promise<MessageRow[]> => {
        try {
            // Try cache first if Redis is available
            if (isRedisAvailable()) {
                const cached = await getChatFromCache(chatId, ctx.userId);
                if (cached) {
                    // Sort messages using shared helper
                    const sortedMessages = sortMessagesByTimeAndRole(
                        cached.messages.map((msg) => ({
                            ...msg,
                            createdAt: new Date(msg.createdAt),
                        }))
                    );

                    // Return messages from cached denormalized structure
                    return sortedMessages.map((msg) => ({
                        id: msg.id,
                        chatId: msg.chatId,
                        role: msg.role,
                        parts: msg.parts,
                        attachments: msg.attachments,
                        createdAt: msg.createdAt,
                    })) as MessageRow[];
                }
            }

            // Guest users: cache-only
            if (ctx.isGuest) {
                return [];
            }

            // Cache miss - fetch from database
            // SECURITY: Verify user owns the chat before returning messages (IDOR protection)
            const [chatRecord] = await db
                .select({ id: chat.id })
                .from(chat)
                .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)))
                .limit(1);

            if (!chatRecord) {
                // Chat doesn't exist or user doesn't own it
                return [];
            }

            const dbMessages = await db
                .select()
                .from(message)
                .where(eq(message.chatId, chatId))
                .orderBy(asc(message.createdAt));

            // Sort messages using shared helper
            return sortMessagesByTimeAndRole(dbMessages);
        } catch (error) {
            throw toDatabaseError(
                "get_messages_by_chat_id",
                error,
                "Failed to get messages by chat id"
            );
        }
    },

    /**
     * Save messages (bulk operation)
     *
     * Flow:
     * - Guest users: append to cache only
     * - Auth users: write to DB + update cache in parallel
     *
     * @param messages Array of messages to save
     * @param ctx Data context (userId, isGuest)
     */
    save: async (messages: DBMessage[], ctx: DataContext): Promise<void> => {
        try {
            // Guest users: cache-only, no database write
            if (ctx.isGuest) {
                if (!isRedisAvailable() || messages.length === 0) {
                    return;
                }

                // Group messages by chatId
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

                // Bulk append for each chat (single cache operation per chat)
                const cachePromises = Array.from(
                    messagesByChatId.entries()
                ).map(([chatId, msgs]) =>
                    appendMessagesToCache(chatId, ctx.userId, msgs)
                );

                await Promise.all(cachePromises);
                return;
            }

            // Authenticated users: DB-first approach to prevent cache/DB inconsistency
            // Write to database first - this is the source of truth
            await db
                .insert(message)
                .values(messages)
                .onConflictDoNothing({ target: message.id });

            // Only update cache after DB write succeeds
            if (isRedisAvailable() && messages.length > 0) {
                // Group messages by chatId
                const messagesByChatId = new Map<string, CachedMessage[]>();

                for (const msg of messages) {
                    if (!msg.chatId) {
                        continue;
                    }

                    if (!messagesByChatId.has(msg.chatId)) {
                        messagesByChatId.set(msg.chatId, []);
                    }

                    const chatMessages = messagesByChatId.get(msg.chatId);
                    if (chatMessages) {
                        chatMessages.push(dbMessageToCachedMessage(msg));
                    }
                }

                // Bulk append for each chat - fire-and-forget for performance
                // Cache inconsistency here is acceptable as DB is source of truth
                const cachePromises: Promise<void>[] = [];
                for (const [chatId, cachedMsgs] of messagesByChatId.entries()) {
                    cachePromises.push(
                        appendMessagesToCache(chatId, ctx.userId, cachedMsgs, {
                            skipExistenceCheck: true,
                        })
                    );
                }

                // Wait for cache updates but don't fail the operation if cache fails
                await Promise.allSettled(cachePromises);
            }

            return;
        } catch (error) {
            throw toDatabaseError(
                "save_messages",
                error,
                "Failed to save messages"
            );
        }
    },

    /**
     * Save messages and context in optimized batch operation
     *
     * Reduces cache operations from ~6 to ~2 (GET + SET) by batching
     * messages and context update together.
     *
     * @param params Save parameters
     * @param ctx Data context (userId, isGuest)
     */
    saveWithContext: async (
        params: {
            messages: DBMessage[];
            chatId: string;
            lastContext?: AppUsage;
            isNewChat?: boolean;
            title?: string;
            visibility?: VisibilityType;
            createdAt?: Date;
        },
        ctx: DataContext
    ): Promise<void> => {
        try {
            const {
                messages,
                chatId,
                lastContext,
                isNewChat,
                title,
                visibility,
                createdAt,
            } = params;

            // Convert messages to cached format using centralized helper
            const cachedMessages: CachedMessage[] = messages.map(
                dbMessageToCachedMessage
            );

            if (ctx.isGuest) {
                // Guest users: cache-only, no database write
                if (isNewChat && title && visibility) {
                    // For new chats, create with messages in one operation
                    // Pass isNewChat to skip redundant existence check
                    await createOrUpdateChatWithMessages({
                        chatId,
                        userId: ctx.userId,
                        title,
                        visibility,
                        messages: cachedMessages,
                        lastContext,
                        _isNewChat: true,
                    });
                } else {
                    // For existing chats, use batch update
                    await batchUpdateChatCache({
                        chatId,
                        userId: ctx.userId,
                        messages: cachedMessages,
                        lastContext,
                        title,
                    });
                }

                // OPTIMIZATION: Increment quota counter for guest users (fire-and-forget)
                const userMessageCount = messages.filter(
                    (msg) => msg.role === "user"
                ).length;
                if (userMessageCount > 0) {
                    incrementUserMessageCountAsync(
                        ctx.userId,
                        userMessageCount
                    );
                }

                return;
            }

            // Authenticated users: DB-FIRST approach to prevent cache/DB inconsistency
            // CRITICAL FIX: Execute DB operations FIRST, then update cache only on success
            // This prevents orphaned cache entries when DB write fails

            if (isNewChat && title && visibility) {
                // For new chats: use transaction to ensure atomicity
                // If message insert fails, the chat won't be left orphaned
                await db.transaction(async (tx) => {
                    await tx.insert(chat).values({
                        id: chatId,
                        userId: ctx.userId,
                        title,
                        visibility,
                        createdAt: createdAt || new Date(),
                        updatedAt: new Date(),
                        lastContext: lastContext || null,
                    });

                    await tx
                        .insert(message)
                        .values(messages)
                        .onConflictDoNothing({ target: message.id });
                });
            } else {
                // For existing chats, insert messages and update context
                await db
                    .insert(message)
                    .values(messages)
                    .onConflictDoNothing({ target: message.id });

                // Update context in DB if provided (for existing chats)
                // SECURITY: Filter by userId to prevent IDOR attacks
                if (lastContext) {
                    await db
                        .update(chat)
                        .set({ lastContext, updatedAt: new Date() })
                        .where(
                            and(
                                eq(chat.id, chatId),
                                eq(chat.userId, ctx.userId)
                            )
                        );
                }
            }

            // Cache update AFTER DB success (fire-and-forget for performance)
            // If cache update fails, DB is source of truth and cache will be warmed on next read
            if (isRedisAvailable()) {
                const updateCacheFn = async () => {
                    if (isNewChat && title && visibility) {
                        await createOrUpdateChatWithMessages({
                            chatId,
                            userId: ctx.userId,
                            title,
                            visibility,
                            messages: cachedMessages,
                            lastContext,
                            createdAt,
                            _isNewChat: true,
                        });
                    } else {
                        await batchUpdateChatCache({
                            chatId,
                            userId: ctx.userId,
                            messages: cachedMessages,
                            lastContext,
                            title,
                        });
                    }
                };

                // Fire-and-forget: cache failures don't block the response
                updateCacheFn().catch((err) =>
                    logError("Cache update failed after DB success", err, {
                        chatId,
                        err,
                    })
                );
            }

            // OPTIMIZATION: Increment quota counter for user messages (fire-and-forget)
            // Only count user messages (not assistant responses)
            const userMessageCount = messages.filter(
                (msg) => msg.role === "user"
            ).length;
            if (userMessageCount > 0) {
                // Increment quota async (don't block on this)
                incrementUserMessageCountAsync(ctx.userId, userMessageCount);
            }

            return;
        } catch (error) {
            throw toDatabaseError(
                "save_messages_and_context",
                error,
                "Failed to save messages and context"
            );
        }
    },

    /**
     * Delete messages after a specific timestamp
     * Used for message regeneration and chat editing
     *
     * @param chatId Chat UUID
     * @param timestamp Delete messages at or after this timestamp
     * @param ctx Data context (userId, isGuest)
     */
    deleteAfterTimestamp: async (
        chatId: string,
        timestamp: Date,
        ctx: DataContext
    ): Promise<void> => {
        try {
            // Run cache and DB deletes in parallel
            const cachePromise = isRedisAvailable()
                ? deleteMessagesFromCacheAfterTimestamp(
                      chatId,
                      ctx.userId,
                      timestamp
                  )
                : Promise.resolve();

            // FIX Issue 2.3: Use transaction to prevent race conditions
            // A concurrent message insert between select and delete could leave orphaned votes
            const dbPromise = ctx.isGuest
                ? Promise.resolve()
                : db.transaction(async (tx) => {
                      const messagesToDelete = await tx
                          .select({ id: message.id })
                          .from(message)
                          .where(
                              and(
                                  eq(message.chatId, chatId),
                                  gte(message.createdAt, timestamp)
                              )
                          );

                      const messageIds = messagesToDelete.map(
                          (msgRec) => msgRec.id
                      );

                      if (messageIds.length > 0) {
                          // Delete votes and messages within the same transaction
                          await tx
                              .delete(vote)
                              .where(
                                  and(
                                      eq(vote.chatId, chatId),
                                      inArray(vote.messageId, messageIds)
                                  )
                              );

                          await tx
                              .delete(message)
                              .where(
                                  and(
                                      eq(message.chatId, chatId),
                                      inArray(message.id, messageIds)
                                  )
                              );
                      }
                  });

            await Promise.all([cachePromise, dbPromise]);
        } catch (error) {
            throw toDatabaseError(
                "delete_messages_after_timestamp",
                error,
                "Failed to delete messages by chat id after timestamp"
            );
        }
    },
};
