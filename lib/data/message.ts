import { and, asc, eq, gte } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { messages } from "@/lib/db/schema"
import type { Message, NewMessage } from "@/lib/types/models.types"

/**
 * Get all messages for a chat, ordered by createdAt ascending.
 */
export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
	return db
		.select()
		.from(messages)
		.where(eq(messages.chatId, chatId))
		.orderBy(asc(messages.createdAt))
}

/**
 * Get a single message by its ID.
 */
export async function getMessageById(messageId: string): Promise<Message | null> {
	const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1)
	return result[0] ?? null
}

/**
 * Batch insert messages. Returns the inserted rows.
 */
export async function saveMessages(newMessages: NewMessage[]): Promise<Message[]> {
	if (newMessages.length === 0) return []
	return db.insert(messages).values(newMessages).returning()
}

/**
 * Delete a message and all messages after it (by createdAt) within the same chat.
 * First looks up the target message's createdAt, then deletes all messages
 * in the chat with createdAt >= that timestamp.
 */
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
	const target = await db
		.select({ createdAt: messages.createdAt })
		.from(messages)
		.where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
		.limit(1)

	const targetMessage = target[0]
	if (!targetMessage) return

	await db
		.delete(messages)
		.where(and(eq(messages.chatId, chatId), gte(messages.createdAt, targetMessage.createdAt)))
}

/**
 * Delete all messages for a chat. Used during chat deletion.
 */
export async function deleteMessagesByChatId(chatId: string): Promise<void> {
	await db.delete(messages).where(eq(messages.chatId, chatId))
}
