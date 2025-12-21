/**
 * Chat Read Operations
 * Ref: 03-data-layer-optimal-design.md §9.1
 */
import "server-only";

import { eq, and, desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Chat, ChatWithMessages } from "@/lib/db";
import type { DataContext, PaginatedResult, PaginationParams } from "../types";
import { isGuest } from "../base";

const { chat, message } = schema;

/**
 * Get a single chat by ID
 * Includes IDOR protection - only returns if user owns the chat
 */
export async function getChat(
    chatId: string,
    ctx: DataContext
): Promise<Chat | null> {
    // Guests cannot access database chats
    if (isGuest(ctx)) {
        return null;
    }

    const db = getDb();
    const [result] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

    return result ?? null;
}

/**
 * Get a chat with all its messages
 */
export async function getChatWithMessages(
    chatId: string,
    ctx: DataContext
): Promise<ChatWithMessages | null> {
    // Guests cannot access database chats
    if (isGuest(ctx)) {
        return null;
    }

    const db = getDb();

    // Get chat with IDOR protection
    const [chatResult] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

    if (!chatResult) {
        return null;
    }

    // Get messages for the chat
    const messages = await db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(message.createdAt);

    return {
        chat: chatResult,
        messages,
    };
}

/**
 * List chats for a user with pagination
 */
export async function listChats(
    ctx: DataContext,
    params: PaginationParams = { limit: 20 }
): Promise<PaginatedResult<Chat>> {
    // Guests cannot list database chats
    if (isGuest(ctx)) {
        return { items: [], hasMore: false };
    }

    const db = getDb();
    const { limit } = params;

    // Fetch one extra to check if there are more
    const chats = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, ctx.userId))
        .orderBy(desc(chat.updatedAt))
        .limit(limit + 1);

    const hasMore = chats.length > limit;
    const items = hasMore ? chats.slice(0, limit) : chats;

    return {
        items,
        hasMore,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
}

/**
 * Check if a chat exists and belongs to user
 */
export async function chatExists(
    chatId: string,
    ctx: DataContext
): Promise<boolean> {
    if (isGuest(ctx)) {
        return false;
    }

    const db = getDb();
    const [result] = await db
        .select({ id: chat.id })
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

    return !!result;
}

/**
 * Get chat count for a user
 */
export async function getChatCount(ctx: DataContext): Promise<number> {
    if (isGuest(ctx)) {
        return 0;
    }

    const db = getDb();
    const result = await db
        .select({ id: chat.id })
        .from(chat)
        .where(eq(chat.userId, ctx.userId));

    return result.length;
}
