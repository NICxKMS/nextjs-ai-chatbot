import "server-only"

import { and, desc, eq, lt, or } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { artifacts, chats, messages, suggestions } from "@/lib/db/schema"
import type { HistoryResponse, PaginationParams } from "@/lib/types/api.types"
import type { Chat, ChatSummary, NewMessage, Visibility } from "@/lib/types/entity.types"

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
): Promise<HistoryResponse<ChatSummary>> {
	const limit = params?.limit ?? DEFAULT_PAGE_SIZE
	const cursor = params?.cursor

	try {
		let cursorDate: Date | undefined

		if (cursor) {
			const cursorChat = await db.query.chats.findFirst({
				where: and(eq(chats.id, cursor), eq(chats.userId, userId)),
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
			.select({
				id: chats.id,
				title: chats.title,
				createdAt: chats.createdAt,
				updatedAt: chats.updatedAt,
				visibility: chats.visibility,
			})
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
 * Get the owner userId of a chat by its ID.
 * Lightweight query — selects only userId. Not cached (used for authorization).
 */
export async function getChatOwnerId(chatId: string): Promise<string | null> {
	try {
		const result = await db
			.select({ userId: chats.userId })
			.from(chats)
			.where(eq(chats.id, chatId))
			.limit(1)

		return result[0]?.userId ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get chat owner", { chatId })
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
 * Create a new chat and persist its first user message atomically.
 */
export async function createChatWithInitialMessage(data: {
	id: string
	userId: string
	title: string
	model?: string
	visibility?: Visibility
	message: NewMessage
}): Promise<Chat> {
	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(chats)
				.values({
					id: data.id,
					userId: data.userId,
					title: data.title,
					model: data.model,
					visibility: data.visibility ?? "private",
				})
				.returning()

			await tx.insert(messages).values(data.message)

			return requireDatabaseRow(created, "Chat insert returned no rows", {
				id: data.id,
			})
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to create chat with initial message", {
			id: data.id,
			messageId: data.message.id,
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
		throwDatabaseError(error, "Failed to update chat title", { chatId })
	}
}

/**
 * Persist assistant messages and update chat metadata atomically.
 */
export async function saveMessagesAndTouchChat(data: {
	chatId: string
	messages: NewMessage[]
	title?: string
}): Promise<void> {
	const updatedAt = new Date()

	try {
		await db.transaction(async (tx) => {
			if (data.messages.length > 0) {
				await tx.insert(messages).values(data.messages)
			}

			await tx
				.update(chats)
				.set(data.title ? { title: data.title, updatedAt } : { updatedAt })
				.where(eq(chats.id, data.chatId))
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to save messages and update chat", {
			chatId: data.chatId,
			count: data.messages.length,
			updatedTitle: data.title,
		})
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
 * Transfer all guest-owned data from one user to another atomically.
 *
 * Used during guest-to-authenticated user migration: reassigns
 * ownership of chats, artifacts, and suggestions created under the
 * guest user ID to the newly authenticated user. All updates happen
 * within a single transaction to prevent orphaned data.
 *
 * Returns the number of transferred chats.
 *
 * **Best-effort** — callers should catch errors and not fail auth flows.
 */
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
	try {
		return await db.transaction(async (tx) => {
			const updatedAt = new Date()

			const transferredChats = await tx
				.update(chats)
				.set({ userId: toUserId, updatedAt })
				.where(eq(chats.userId, fromUserId))
				.returning({ id: chats.id })

			await tx
				.update(artifacts)
				.set({ userId: toUserId, updatedAt })
				.where(eq(artifacts.userId, fromUserId))

			await tx
				.update(suggestions)
				.set({ userId: toUserId })
				.where(eq(suggestions.userId, fromUserId))

			return transferredChats.length
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to transfer guest chats", {
			fromUserId,
			toUserId,
		})
	}
}
