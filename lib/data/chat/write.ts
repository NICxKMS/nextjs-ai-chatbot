/**
 * Chat Write Operations
 * Ref: 03-data-layer-optimal-design.md §9.2
 */
import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { Chat, NewChat, Visibility } from "@/lib/db";
import { getDb, schema, withTransaction } from "@/lib/db";
import { requireNonGuest } from "../base";
import type { DataContext } from "../types";

const { chat, message, vote } = schema;

/**
 * Create a new chat
 */
export async function createChat(
    data: {
        id?: string;
        title: string;
        visibility?: Visibility;
    },
    ctx: DataContext
): Promise<Chat> {
    requireNonGuest(ctx);

    const db = getDb();
    const newChat: NewChat = {
        id: data.id ?? randomUUID(),
        userId: ctx.userId,
        title: data.title,
        visibility: data.visibility ?? "private",
    };

    const [result] = await db.insert(chat).values(newChat).returning();

    if (!result) {
        throw new Error("Failed to create chat");
    }

    return result;
}

/**
 * Delete a chat and all related data
 * Uses transaction to ensure atomicity
 */
export async function deleteChat(
    chatId: string,
    ctx: DataContext
): Promise<boolean> {
    requireNonGuest(ctx);

    return withTransaction(async (tx) => {
        // Verify ownership first
        const [existingChat] = await tx
            .select({ id: chat.id })
            .from(chat)
            .where(and(eq(chat.id, chatId), eq(chat.userId, ctx.userId)));

        if (!existingChat) {
            return false;
        }

        // Delete related entities
        await Promise.all([
            tx.delete(vote).where(eq(vote.chatId, chatId)),
            tx.delete(message).where(eq(message.chatId, chatId)),
        ]);

        // Delete chat
        await tx.delete(chat).where(eq(chat.id, chatId));

        return true;
    }, "deleteChat");
}

/**
 * Delete all chats for a user
 */
export async function deleteAllChats(ctx: DataContext): Promise<number> {
    requireNonGuest(ctx);

    return withTransaction(async (tx) => {
        // Get all chat IDs for user
        const userChats = await tx
            .select({ id: chat.id })
            .from(chat)
            .where(eq(chat.userId, ctx.userId));

        if (userChats.length === 0) {
            return 0;
        }

        const chatIds = userChats.map((c) => c.id);

        // Delete all related data in batch (more efficient than serial loop)
        await Promise.all([
            tx.delete(vote).where(inArray(vote.chatId, chatIds)),
            tx.delete(message).where(inArray(message.chatId, chatIds)),
        ]);

        // Delete all chats
        await tx.delete(chat).where(eq(chat.userId, ctx.userId));

        return chatIds.length;
    }, "deleteAllChats");
}
