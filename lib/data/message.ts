import "server-only"

import { and, desc, eq, gte } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { messages } from "@/lib/db/schema"
import type { Message, NewMessage } from "@/lib/types/entity.types"

type ChatRenderMessage = Pick<Message, "id" | "role" | "parts">

/**
 * Safety cap for message queries — prevents unbounded result sets.
 * The chat route handler uses this default for AI context (needs full history).
 * Pages that only need recent messages should pass a lower explicit limit.
 */
const DEFAULT_MESSAGE_LIMIT = 500

/**
 * Get the most recent messages for rendering chat history.
 *
 * Fetches the last `limit` messages by selecting in reverse chronological
 * order, then reverses the result to chronological (oldest-first) for display.
 * This ensures that when a chat exceeds the limit, the most recent messages
 * are preserved rather than the oldest.
 */
export async function getMessagesForChatRender(
	chatId: string,
	limit = DEFAULT_MESSAGE_LIMIT,
): Promise<ChatRenderMessage[]> {
	try {
		const rows = await db
			.select({
				id: messages.id,
				role: messages.role,
				parts: messages.parts,
			})
			.from(messages)
			.where(eq(messages.chatId, chatId))
			.orderBy(desc(messages.createdAt))
			.limit(limit)

		// Reverse to chronological order (oldest-first) for display
		return rows.reverse()
	} catch (error) {
		throwDatabaseError(error, "Failed to get messages for chat render", { chatId })
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
 * Uses a transaction to atomically look up the target timestamp and delete,
 * preventing race conditions with concurrent message inserts.
 *
 * NOTE: Uses createdAt >= for deletion. If two messages share the exact same
 * timestamp, both will be deleted. Acceptable for branch-from-message but
 * worth noting as a known limitation.
 */
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
	try {
		await db.transaction(async (tx) => {
			const target = await tx
				.select({ createdAt: messages.createdAt })
				.from(messages)
				.where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
				.limit(1)

			const targetMessage = target[0]
			if (!targetMessage) return

			await tx
				.delete(messages)
				.where(
					and(
						eq(messages.chatId, chatId),
						gte(messages.createdAt, targetMessage.createdAt),
					),
				)
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to delete messages after target", {
			chatId,
			messageId,
		})
	}
}
