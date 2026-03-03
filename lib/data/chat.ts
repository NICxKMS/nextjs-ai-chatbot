import { and, asc, desc, eq, lt } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { chats, messages } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
import type { PaginationParams } from "@/lib/types/api.types"
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
		if (error instanceof AppError) throw error
		throw AppError.internal("internal_error:database:query_failed", "Failed to get chat", {
			chatId,
			cause: error,
		})
	}
}

/**
 * Get paginated chats for a user, ordered by updatedAt DESC.
 * Uses cursor-based pagination where the cursor is a chat ID.
 */
export async function getChatsByUserId(
	userId: string,
	params?: PaginationParams,
): Promise<{ chats: Chat[]; hasMore: boolean; nextCursor?: string }> {
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

		const conditions = [eq(chats.userId, userId)]
		if (cursorDate) {
			conditions.push(lt(chats.updatedAt, cursorDate))
		}

		const results = await db
			.select()
			.from(chats)
			.where(and(...conditions))
			.orderBy(desc(chats.updatedAt))
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get chats for user",
			{ userId, cause: error },
		)
	}
}

/**
 * Co-fetch a chat and its messages in parallel.
 * Messages are ordered by createdAt ASC.
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get chat with messages",
			{ chatId, cause: error },
		)
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
	visibility?: string
}): Promise<Chat> {
	try {
		const [created] = await db
			.insert(chats)
			.values({
				id: data.id,
				userId: data.userId,
				title: data.title,
				model: data.model,
				visibility: (data.visibility as Visibility) ?? "private",
			})
			.returning()

		if (!created) {
			throw AppError.internal(
				"internal_error:database:query_failed",
				"Chat insert returned no rows",
				{ id: data.id },
			)
		}

		return created
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal("internal_error:database:query_failed", "Failed to create chat", {
			cause: error,
		})
	}
}

/**
 * Update the title of a chat.
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
	try {
		await db.update(chats).set({ title, updatedAt: new Date() }).where(eq(chats.id, chatId))
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to update chat title",
			{ chatId, cause: error },
		)
	}
}

/**
 * Update the visibility of a chat.
 */
export async function updateChatVisibility(chatId: string, visibility: string): Promise<void> {
	try {
		await db
			.update(chats)
			.set({
				visibility: visibility as Visibility,
				updatedAt: new Date(),
			})
			.where(eq(chats.id, chatId))
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to update chat visibility",
			{ chatId, cause: error },
		)
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
		if (error instanceof AppError) throw error
		throw AppError.internal("internal_error:database:query_failed", "Failed to delete chat", {
			chatId,
			cause: error,
		})
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to delete all chats for user",
			{ userId, cause: error },
		)
	}
}
