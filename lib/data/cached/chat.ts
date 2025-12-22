/**
 * Cached Chat Operations
 * Ref: 03-data-layer-optimal-design.md
 *
 * Cache-integrated chat data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback, background warm
 * - WRITE: Write to DB, then update cache
 * - DELETE: Delete from DB, then delete from cache
 * - GUEST: Cache-only (no DB calls)
 */
import "server-only";

import type { CachedChatMeta } from "@/lib/cache/types";
import {
    createChatInCache,
    deleteAllUserChatsFromCache,
    deleteChatFromCache,
    getChatFromCache,
    getMessagesFromCache,
    getUserChatsFromCache,
    updateChatInCache,
} from "@/lib/cache-ops";
import type { Chat, ChatWithMessages, Visibility } from "@/lib/db";
import { isGuest } from "../base";
import {
    createChat,
    deleteAllChats,
    deleteChat,
    getChat,
    getChatWithMessages,
    listChats,
    updateChatTitle,
    updateChatVisibility,
} from "../chat";
import type { DataContext } from "../types";

/**
 * Get chat with cache-first strategy
 * 1. Try cache
 * 2. Guest = cache-only, return null if miss
 * 3. Auth = DB fallback + background cache warm
 */
export async function getChatCached(
    chatId: string,
    ctx: DataContext
): Promise<Chat | null> {
    // Try cache first
    const cached = await getChatFromCache(chatId, ctx.userId);
    if (cached) {
        return cachedChatToChat(cached);
    }

    // Guest = cache-only
    if (isGuest(ctx)) return null;

    // Auth = DB fallback
    const chat = await getChat(chatId, ctx);
    if (chat) {
        // Background warm cache
        createChatInCache(chatToCachedMeta(chat), false).catch(() => {});
    }
    return chat;
}

/**
 * Get chat with messages using cache-first strategy
 */
export async function getChatWithMessagesCached(
    chatId: string,
    ctx: DataContext
): Promise<ChatWithMessages | null> {
    // Try cache first - get both chat meta and messages
    const [cachedChat, cachedMessages] = await Promise.all([
        getChatFromCache(chatId, ctx.userId),
        getMessagesFromCache(chatId, ctx.userId),
    ]);

    if (cachedChat && cachedMessages) {
        // TODO: Convert cached messages to DB messages
        // For now, fall through to DB
    }

    // Guest = cache-only
    if (isGuest(ctx)) return null;

    // Auth = DB fallback
    return getChatWithMessages(chatId, ctx);
}

/**
 * Get user chats with cache-first strategy
 */
export async function getUserChatsCached(ctx: DataContext): Promise<Chat[]> {
    // Try cache first
    const cached = await getUserChatsFromCache(ctx.userId);
    if (cached && cached.length > 0) {
        // Cache returns chat IDs with timestamps, need to fetch full chat data
        // For now, fall through to DB for full data
    }

    // Guest = cache-only, return empty
    if (isGuest(ctx)) return [];

    // Auth = DB fallback
    const result = await listChats(ctx);
    return result.items;
}

/**
 * Create chat: Write to DB first, then cache
 */
export async function createChatCached(
    data: { id?: string; title: string; visibility?: Visibility },
    ctx: DataContext
): Promise<Chat> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only (create mock chat)
    if (guestMode) {
        const mockChat: Chat = {
            id: data.id ?? crypto.randomUUID(),
            userId: ctx.userId,
            title: data.title,
            visibility: data.visibility ?? "private",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastContext: null,
        };
        await createChatInCache(chatToCachedMeta(mockChat), true);
        return mockChat;
    }

    // Auth = DB first, then cache
    const chat = await createChat(data, ctx);
    await createChatInCache(chatToCachedMeta(chat), false).catch(() => {});
    return chat;
}

/**
 * Delete chat: Delete from DB first, then cache
 */
export async function deleteChatCached(
    chatId: string,
    ctx: DataContext
): Promise<boolean> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        await deleteChatFromCache(chatId, ctx.userId);
        return true;
    }

    // Auth = DB first, then cache
    const deleted = await deleteChat(chatId, ctx);
    if (deleted) {
        await deleteChatFromCache(chatId, ctx.userId).catch(() => {});
    }
    return deleted;
}

/**
 * Delete all user chats: Delete from DB first, then cache
 */
export async function deleteAllUserChatsCached(
    ctx: DataContext
): Promise<number> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        const deleted = await deleteAllUserChatsFromCache(ctx.userId);
        return deleted;
    }

    // Auth = DB first, then cache
    const count = await deleteAllChats(ctx);
    await deleteAllUserChatsFromCache(ctx.userId).catch(() => {});
    return count;
}

/**
 * Update chat title: Update DB first, then cache
 */
export async function updateChatTitleCached(
    chatId: string,
    title: string,
    ctx: DataContext
): Promise<Chat | null> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        await updateChatInCache(chatId, ctx.userId, { title });
        return null; // No full chat data in guest mode
    }

    // Auth = DB first, then cache
    const chat = await updateChatTitle(chatId, title, ctx);
    if (chat) {
        await updateChatInCache(chatId, ctx.userId, { title }).catch(() => {});
    }
    return chat;
}

/**
 * Update chat visibility: Update DB first, then cache
 */
export async function updateChatVisibilityCached(
    chatId: string,
    visibility: Visibility,
    ctx: DataContext
): Promise<Chat | null> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        await updateChatInCache(chatId, ctx.userId, { visibility });
        return null; // No full chat data in guest mode
    }

    // Auth = DB first, then cache
    const chat = await updateChatVisibility(chatId, visibility, ctx);
    if (chat) {
        await updateChatInCache(chatId, ctx.userId, { visibility }).catch(
            () => {}
        );
    }
    return chat;
}

// ============================================================================
// Helpers: Convert between DB types and Cache types
// ============================================================================

function chatToCachedMeta(chat: Chat): CachedChatMeta {
    return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        visibility: chat.visibility,
        createdAt: chat.createdAt.getTime(),
        updatedAt: chat.updatedAt.getTime(),
        version: 1, // Initial version
    };
}

function cachedChatToChat(cached: CachedChatMeta): Chat {
    return {
        id: cached.id,
        userId: cached.userId,
        title: cached.title,
        visibility: cached.visibility,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
        lastContext: null, // Not stored in cache
    };
}
