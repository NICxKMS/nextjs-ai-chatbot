/**
 * Cached Message Operations
 * Ref: 03-data-layer-optimal-design.md
 *
 * Cache-integrated message data operations.
 * Strategy:
 * - READ: Cache-first, DB fallback, background warm
 * - WRITE: Write to DB, then update cache
 * - DELETE: Delete from DB, then delete from cache
 * - GUEST: Cache-only (no DB calls)
 */
import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/tags";
import type { CachedMessage } from "@/lib/cache/types";
import {
    appendMessagesToCache,
    appendMessageToCache,
    deleteMessagesAfterTimestamp,
    getMessagesFromCache,
} from "@/lib/cache-ops";
import { getDb, type Message, schema } from "@/lib/db";
import { isGuest } from "../base";
import type { DataContext } from "../types";

const { message: messageTable } = schema;

/**
 * Get messages with cache-first strategy
 */
export async function getMessagesCached(
    chatId: string,
    ctx: DataContext
): Promise<Message[]> {
    "use cache";
    cacheLife("chatMessages");
    cacheTag(CacheTags.chatMessages(chatId));

    // Try cache first
    const cached = await getMessagesFromCache(chatId, ctx.userId);
    if (cached && cached.length > 0) {
        return cached.map(cachedMessageToMessage);
    }

    // Guest = cache-only
    if (isGuest(ctx)) {
        return [];
    }

    // Auth = DB fallback on cache miss
    const db = getDb();
    const messages = await db
        .select()
        .from(messageTable)
        .where(eq(messageTable.chatId, chatId))
        .orderBy(messageTable.createdAt);

    // Warm cache for next time (non-blocking)
    if (messages.length > 0) {
        appendMessagesToCache(
            chatId,
            ctx.userId,
            messages.map(messageToCached),
            false
        ).catch(() => {});
    }

    return messages;
}

/**
 * Append single message: Write to DB first, then cache
 */
export async function appendMessageCached(
    chatId: string,
    message: Message,
    ctx: DataContext
): Promise<void> {
    const guestMode = isGuest(ctx);
    const cachedMsg = messageToCached(message);

    // Guest = cache-only
    if (guestMode) {
        await appendMessageToCache(chatId, ctx.userId, cachedMsg, true);
        return;
    }

    // Auth = DB first, then cache
    const db = getDb();
    await db.insert(messageTable).values(message);
    await appendMessageToCache(chatId, ctx.userId, cachedMsg, false).catch(
        () => {}
    );
}

/**
 * Append multiple messages: Write to DB first, then cache
 */
export async function appendMessagesCached(
    chatId: string,
    messages: Message[],
    ctx: DataContext
): Promise<void> {
    if (messages.length === 0) {
        return;
    }

    const guestMode = isGuest(ctx);
    const cachedMsgs = messages.map(messageToCached);

    // Guest = cache-only
    if (guestMode) {
        await appendMessagesToCache(chatId, ctx.userId, cachedMsgs, true);
        return;
    }

    // Auth = DB first, then cache
    const db = getDb();
    await db.insert(messageTable).values(messages);
    await appendMessagesToCache(chatId, ctx.userId, cachedMsgs, false).catch(
        () => {}
    );
}

/**
 * Delete messages after timestamp: Delete from DB first, then cache
 */
export async function deleteMessagesAfterTimestampCached(
    chatId: string,
    afterTimestamp: number,
    ctx: DataContext
): Promise<number> {
    const guestMode = isGuest(ctx);

    // Guest = cache-only
    if (guestMode) {
        return deleteMessagesAfterTimestamp(chatId, ctx.userId, afterTimestamp);
    }

    // Auth = DB first, then cache
    const db = getDb();
    const afterDate = new Date(afterTimestamp);
    await db
        .delete(messageTable)
        .where(
            and(
                eq(messageTable.chatId, chatId),
                gt(messageTable.createdAt, afterDate)
            )
        )
        .execute();
    const count = await deleteMessagesAfterTimestamp(
        chatId,
        ctx.userId,
        afterTimestamp
    );
    return count;
}

// ============================================================================
// Helpers: Convert between DB types and Cache types
// ============================================================================

function messageToCached(message: Message): CachedMessage {
    return {
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        parts: message.parts as CachedMessage["parts"],
        attachments: (message.attachments ??
            []) as CachedMessage["attachments"],
        createdAt: message.createdAt.getTime(),
    };
}

function cachedMessageToMessage(cached: CachedMessage): Message {
    return {
        id: cached.id,
        chatId: cached.chatId,
        role: cached.role,
        parts: cached.parts,
        attachments: cached.attachments ?? [],
        createdAt: new Date(cached.createdAt),
    };
}
