import { and, asc, eq, gte } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { messages } from "@/lib/db/schema"
import type { Message, NewMessage } from "@/lib/types/models.types"

type ChatRenderMessage = Pick<Message, "id" | "role" | "parts">

/** Safety cap for message queries — prevents unbounded result sets. */
const DEFAULT_MESSAGE_LIMIT = 500

/**
 * Get the reduced message shape used to render chat history.
 */
export async function getMessagesForChatRender(
	chatId: string,
	limit = DEFAULT_MESSAGE_LIMIT,
): Promise<ChatRenderMessage[]> {
	try {
		return await db
			.select({
				id: messages.id,
				role: messages.role,
				parts: messages.parts,
			})
			.from(messages)
			.where(eq(messages.chatId, chatId))
			.orderBy(asc(messages.createdAt))
			.limit(limit)
	} catch (error) {
		throwDatabaseError(error, "Failed to get messages for chat render", { chatId })
	}
}

/**
 * Get all messages for a chat, ordered by createdAt ascending.
 */
export async function getMessagesByChatId(
	chatId: string,
	limit = DEFAULT_MESSAGE_LIMIT,
): Promise<Message[]> {
	try {
		return await db
			.select()
			.from(messages)
			.where(eq(messages.chatId, chatId))
			.orderBy(asc(messages.createdAt))
			.limit(limit)
	} catch (error) {
		throwDatabaseError(error, "Failed to get messages for chat", { chatId })
	}
}

/**
 * Get a single message by its ID.
 */
export async function getMessageById(messageId: string): Promise<Message | null> {
	try {
		const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1)
		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get message", { messageId })
	}
}

/**
 * Batch insert messages. Returns the inserted rows.
 */
export async function saveMessages(newMessages: NewMessage[]): Promise<Message[]> {
	if (newMessages.length === 0) return []
	try {
		return await db.insert(messages).values(newMessages).returning()
	} catch (error) {
		throwDatabaseError(error, "Failed to save messages", { count: newMessages.length })
	}
}

/**
 * Delete a message and all messages after it (by createdAt) within the same chat.
 * First looks up the target message's createdAt, then deletes all messages
 * in the chat with createdAt >= that timestamp.
 */
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
	try {
		const target = await db
			.select({ createdAt: messages.createdAt })
			.from(messages)
			.where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
			.limit(1)

		const targetMessage = target[0]
		if (!targetMessage) return

		// NOTE: Uses createdAt >= for deletion. If two messages share the exact same
		// timestamp, both will be deleted. Acceptable for branch-from-message but
		// worth noting as a known limitation.
		await db
			.delete(messages)
			.where(
				and(eq(messages.chatId, chatId), gte(messages.createdAt, targetMessage.createdAt)),
			)
	} catch (error) {
		throwDatabaseError(error, "Failed to delete messages after target", {
			chatId,
			messageId,
		})
	}
}

/**
 * Delete all messages for a chat.
 *
 * @unused FK cascade on `chats.id → messages.chatId` handles
 * cleanup during chat deletion. Retained for explicit bulk-delete scenarios.
 */
export async function deleteMessagesByChatId(chatId: string): Promise<void> {
	try {
		await db.delete(messages).where(eq(messages.chatId, chatId))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete messages for chat", { chatId })
	}
}
