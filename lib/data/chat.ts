import { and, asc, desc, eq, lt, or } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { chats, messages } from "@/lib/db/schema"
import type { HistoryResponse, PaginationParams } from "@/lib/types/api.types"
import type { Chat, Message, Visibility } from "@/lib/types/models.types"

const DEFAULT_PAGE_SIZE = 20

/**
 * Get a chat by its ID.
 * Pure DB lookup — no auth, no caching.
 */
export async function getChatById(chatId: string): Promise<Chat | null> {
	try {
		const result = await db.query.chats.findFirst({
			where: eq(chats.id, chatId),
		})
		return result ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get chat", { chatId })
	}
}

/**
 * Get paginated chats for a user, ordered by updatedAt DESC.
 * Uses cursor-based pagination where the cursor is a chat ID.
 */
export async function getChatsByUserId(
	userId: string,
	params?: PaginationParams,
): Promise<HistoryResponse<Chat>> {
	const limit = params?.limit ?? DEFAULT_PAGE_SIZE
	const cursor = params?.cursor

	try {
		let cursorDate: Date | undefined

		if (cursor) {
			const cursorChat = await db.query.chats.findFirst({
				where: eq(chats.id, cursor),
				columns: { updatedAt: true },
			})
			if (cursorChat) {
				cursorDate = cursorChat.updatedAt
			}
		}

		// Compound cursor: (updatedAt, id) prevents skipping rows
		// when multiple chats share the same updatedAt timestamp.
		const cursorCondition =
			cursorDate && cursor
				? or(
						lt(chats.updatedAt, cursorDate),
						and(eq(chats.updatedAt, cursorDate), lt(chats.id, cursor)),
					)
				: undefined

		const results = await db
			.select()
			.from(chats)
			.where(and(eq(chats.userId, userId), cursorCondition))
			.orderBy(desc(chats.updatedAt), desc(chats.id))
			.limit(limit + 1)

		const hasMore = results.length > limit
		const chatItems = hasMore ? results.slice(0, limit) : results

		const lastChat = chatItems[chatItems.length - 1]

		return {
			chats: chatItems,
			hasMore,
			nextCursor: hasMore && lastChat ? lastChat.id : undefined,
		}
	} catch (error) {
		throwDatabaseError(error, "Failed to get chats for user", { userId })
	}
}

/**
 * Co-fetch a chat and its messages in parallel.
 * Messages are ordered by createdAt ASC.
 *
 * @unused Chat page fetches chat and messages separately
 * with individual cache tags. Retained as a convenience for non-cached contexts.
 */
export async function getChatWithMessages(
	chatId: string,
): Promise<{ chat: Chat; messages: Message[] } | null> {
	try {
		const [chatResult, chatMessages] = await Promise.all([
			db.query.chats.findFirst({ where: eq(chats.id, chatId) }),
			db
				.select()
				.from(messages)
				.where(eq(messages.chatId, chatId))
				.orderBy(asc(messages.createdAt)),
		])

		if (!chatResult) return null

		return { chat: chatResult, messages: chatMessages }
	} catch (error) {
		throwDatabaseError(error, "Failed to get chat with messages", { chatId })
	}
}

/**
 * Create a new chat. Returns the inserted row.
 */
export async function createChat(data: {
	id: string
	userId: string
	title: string
	model?: string
	visibility?: Visibility
}): Promise<Chat> {
	try {
		const [created] = await db
			.insert(chats)
			.values({
				id: data.id,
				userId: data.userId,
				title: data.title,
				model: data.model,
				visibility: data.visibility ?? "private",
			})
			.returning()

		return requireDatabaseRow(created, "Chat insert returned no rows", { id: data.id })
	} catch (error) {
		throwDatabaseError(error, "Failed to create chat")
	}
}

/**
 * Update the title of a chat.
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
	try {
		await db.update(chats).set({ title, updatedAt: new Date() }).where(eq(chats.id, chatId))
	} catch (error) {
		throwDatabaseError(error, "Failed to update chat title", { chatId })
	}
}

/**
 * Update the visibility of a chat.
 */
export async function updateChatVisibility(chatId: string, visibility: Visibility): Promise<void> {
	try {
		await db
			.update(chats)
			.set({
				visibility,
				updatedAt: new Date(),
			})
			.where(eq(chats.id, chatId))
	} catch (error) {
		throwDatabaseError(error, "Failed to update chat visibility", { chatId })
	}
}

/**
 * Delete a chat by ID.
 * Associated messages, votes, and artifacts are removed via FK cascade.
 */
export async function deleteChat(chatId: string): Promise<void> {
	try {
		await db.delete(chats).where(eq(chats.id, chatId))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete chat", { chatId })
	}
}

/**
 * Delete all chats for a user.
 * Associated messages, votes, and artifacts are removed via FK cascade.
 */
export async function deleteAllChats(userId: string): Promise<void> {
	try {
		await db.delete(chats).where(eq(chats.userId, userId))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete all chats for user", { userId })
	}
}

/**
 * Transfer all chats from one user to another.
 *
 * Used during guest-to-authenticated user migration: reassigns
 * ownership of all chats created under the guest user ID to the
 * newly authenticated user. Returns the number of transferred chats.
 *
 * **Best-effort** — callers should catch errors and not fail auth flows.
 */
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
	try {
		const result = await db
			.update(chats)
			.set({ userId: toUserId, updatedAt: new Date() })
			.where(eq(chats.userId, fromUserId))
			.returning({ id: chats.id })

		return result.length
	} catch (error) {
		throwDatabaseError(error, "Failed to transfer guest chats", {
			fromUserId,
			toUserId,
		})
	}
}
