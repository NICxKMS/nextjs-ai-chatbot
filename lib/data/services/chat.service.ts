/**
 * Chat Service
 *
 * Orchestration service for chat operations spanning multiple repositories
 * (chat + messages + votes). Handles transactions for multi-repo operations
 * and provides a unified API for chat-related business logic.
 *
 * @module lib/data/services/chat.service
 */

import "server-only"

import { and, eq } from "drizzle-orm"

import { db, withTransaction } from "@/lib/db/client"
import type { Chat, DBMessage, Message, NewChat, Vote } from "@/lib/db/schema"
import { chat, message, vote } from "@/lib/db/schema"
import {
	ForbiddenError,
	InternalServerError,
	NotFoundError,
} from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

import {
	chatRepository,
	type PaginatedResult,
	type PaginationParams,
	type RepositoryContext,
} from "../repositories"

// =============================================================================
// Types
// =============================================================================

/**
 * Chat with messages loaded
 */
export interface ChatWithMessages {
	/** Chat metadata */
	chat: Chat
	/** Messages belonging to the chat */
	messages: Message[]
}

/**
 * Parameters for saving chat with messages
 */
export interface SaveChatParams {
	/** Chat ID */
	chatId: string
	/** Whether this is a new chat */
	isNewChat: boolean
	/** Messages to save */
	messages: DBMessage[]
	/** Title for the chat */
	title?: string
	/** Visibility setting */
	visibility?: "public" | "private"
	/** Created at timestamp override */
	createdAt?: Date
}

/**
 * Result of chat deletion
 */
export interface DeleteChatResult {
	/** The deleted chat */
	chat: Chat
	/** Number of messages deleted */
	messagesDeleted: number
	/** Number of votes deleted */
	votesDeleted: number
}

// =============================================================================
// Chat Service Implementation
// =============================================================================

/**
 * Chat service for orchestrating chat, message, and vote operations.
 *
 * Provides high-level business operations that span multiple repositories
 * with transaction support for data consistency.
 *
 * @example
 * ```typescript
 * const service = chatService;
 *
 * // Get chat with messages
 * const result = await service.getWithMessages(chatId, ctx);
 *
 * // Save chat with messages (handles new/existing)
 * await service.saveChat(params, ctx);
 *
 * // Delete chat with cascade
 * const deleted = await service.deleteChat(chatId, ctx);
 * ```
 */
class ChatService {
	// =============================================================================
	// Read Operations
	// =============================================================================

	/**
	 * Get a chat with all its messages.
	 * Verifies user ownership before returning.
	 *
	 * @param chatId - Chat ID
	 * @param ctx - Repository context with user info
	 * @returns Chat with messages or null if not found/no access
	 */
	async getWithMessages(
		chatId: string,
		ctx: RepositoryContext,
	): Promise<ChatWithMessages | null> {
		try {
			// Get chat with ownership check
			const chatResult = await chatRepository.findById(chatId, ctx)
			if (!chatResult) {
				return null
			}

			// Verify ownership
			if (chatResult.userId !== ctx.userId) {
				throw new ForbiddenError(
					"You do not have access to this chat",
					{
						chatId,
						userId: ctx.userId,
					},
				)
			}

			// Fetch messages for the chat
			const messages = await db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(message.createdAt)

			return {
				chat: chatResult,
				messages: messages as Message[],
			}
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error
			}
			logError("ChatService getWithMessages error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to get chat with messages", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get paginated chat history for a user.
	 *
	 * @param pagination - Pagination parameters
	 * @param ctx - Repository context with user info
	 * @returns Paginated result with chats
	 */
	async getHistory(
		pagination: PaginationParams,
		ctx: RepositoryContext,
	): Promise<PaginatedResult<Chat>> {
		try {
			return await chatRepository.findByUserId(
				ctx.userId,
				pagination,
				ctx,
			)
		} catch (error) {
			logError("ChatService getHistory error", error as Error, {
				userId: ctx.userId,
			})
			throw new InternalServerError("Failed to get chat history", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get a single chat by ID with ownership check.
	 *
	 * @param chatId - Chat ID
	 * @param ctx - Repository context with user info
	 * @returns The chat or null if not found/no access
	 */
	async getChatById(
		chatId: string,
		ctx: RepositoryContext,
	): Promise<Chat | null> {
		try {
			const chatResult = await chatRepository.findById(chatId, ctx)

			// Verify ownership
			if (chatResult && chatResult.userId !== ctx.userId) {
				throw new ForbiddenError(
					"You do not have access to this chat",
					{
						chatId,
						userId: ctx.userId,
					},
				)
			}

			return chatResult
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error
			}
			logError("ChatService getChatById error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to get chat", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Write Operations
	// =============================================================================

	/**
	 * Create a new chat.
	 *
	 * @param userId - User ID who owns the chat
	 * @param title - Optional chat title
	 * @param ctx - Repository context
	 * @returns The created chat
	 */
	async createChat(
		userId: string,
		title?: string,
		ctx?: RepositoryContext,
	): Promise<Chat> {
		try {
			const chatData: NewChat = {
				id: crypto.randomUUID(),
				userId,
				title: title ?? "New Chat",
				visibility: "private",
				createdAt: new Date(),
			}

			return await chatRepository.create(chatData, ctx)
		} catch (error) {
			logError("ChatService createChat error", error as Error, { userId })
			throw new InternalServerError("Failed to create chat", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Save chat with messages.
	 * Handles both new chat creation and message appending.
	 *
	 * @param params - Save parameters
	 * @param ctx - Repository context with user info
	 */
	async saveChat(
		params: SaveChatParams,
		ctx: RepositoryContext,
	): Promise<void> {
		const {
			chatId,
			isNewChat,
			messages: messagesToSave,
			title,
			visibility,
			createdAt,
		} = params

		try {
			await withTransaction(async (tx) => {
				// Create chat if new
				if (isNewChat) {
					await tx.insert(chat).values({
						id: chatId,
						userId: ctx.userId,
						title: title ?? "New Chat",
						visibility: visibility ?? "private",
						createdAt: createdAt ?? new Date(),
					})
				}

				// Insert messages
				if (messagesToSave.length > 0) {
					await tx.insert(message).values(messagesToSave)
				}

				logDebug("ChatService saveChat completed", {
					chatId,
					isNewChat,
					messageCount: messagesToSave.length,
				})
			})
		} catch (error) {
			logError("ChatService saveChat error", error as Error, {
				chatId,
				isNewChat,
			})
			throw new InternalServerError("Failed to save chat", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update chat title.
	 *
	 * @param chatId - Chat ID
	 * @param title - New title
	 * @param ctx - Repository context with user info
	 */
	async updateTitle(
		chatId: string,
		title: string,
		ctx: RepositoryContext,
	): Promise<void> {
		try {
			const result = await chatRepository.update(chatId, { title }, ctx)

			if (!result) {
				throw new NotFoundError("Chat", chatId)
			}

			logDebug("ChatService updateTitle completed", { chatId, title })
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ChatService updateTitle error", error as Error, {
				chatId,
				title,
			})
			throw new InternalServerError("Failed to update chat title", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a chat with all its messages and votes (cascade delete).
	 * Uses a transaction to ensure data consistency.
	 *
	 * @param chatId - Chat ID
	 * @param ctx - Repository context with user info
	 * @returns Delete result with counts
	 */
	async deleteChat(
		chatId: string,
		ctx: RepositoryContext,
	): Promise<DeleteChatResult> {
		try {
			// First verify ownership
			const chatResult = await chatRepository.findById(chatId, ctx)
			if (!chatResult) {
				throw new NotFoundError("Chat", chatId)
			}

			if (chatResult.userId !== ctx.userId) {
				throw new ForbiddenError(
					"You do not have permission to delete this chat",
					{
						chatId,
						userId: ctx.userId,
					},
				)
			}

			// Perform cascade delete in transaction
			const result = await withTransaction(async (tx) => {
				// Delete votes for this chat
				const deletedVotes = await tx
					.delete(vote)
					.where(eq(vote.chatId, chatId))
					.returning({ id: vote.chatId })

				// Delete messages for this chat
				const deletedMessages = await tx
					.delete(message)
					.where(eq(message.chatId, chatId))
					.returning({ id: message.id })

				// Delete the chat
				const [deletedChat] = await tx
					.delete(chat)
					.where(eq(chat.id, chatId))
					.returning()

				return {
					chat: deletedChat,
					messagesDeleted: deletedMessages.length,
					votesDeleted: deletedVotes.length,
				}
			})

			logDebug("ChatService deleteChat completed", {
				chatId,
				messagesDeleted: result.messagesDeleted,
				votesDeleted: result.votesDeleted,
			})

			return result as DeleteChatResult
		} catch (error) {
			if (
				error instanceof NotFoundError ||
				error instanceof ForbiddenError
			) {
				throw error
			}
			logError("ChatService deleteChat error", error as Error, { chatId })
			throw new InternalServerError("Failed to delete chat", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete all chats for a user with cascade (messages, votes).
	 *
	 * @param ctx - Repository context with user info
	 * @returns Number of chats deleted
	 */
	async deleteAllChats(
		ctx: RepositoryContext,
	): Promise<{ deletedCount: number }> {
		try {
			// Get all chats for the user
			const userChats = await db
				.select({ id: chat.id })
				.from(chat)
				.where(eq(chat.userId, ctx.userId))

			if (userChats.length === 0) {
				return { deletedCount: 0 }
			}

			const chatIds = userChats.map((c) => c.id)

			// Perform cascade delete in transaction
			await withTransaction(async (tx) => {
				// Delete all votes for user's chats
				await tx.delete(vote).where(eq(vote.userId, ctx.userId))

				// Delete all messages for user's chats
				for (const id of chatIds) {
					await tx.delete(message).where(eq(message.chatId, id))
				}

				// Delete all chats
				await tx.delete(chat).where(eq(chat.userId, ctx.userId))
			})

			logDebug("ChatService deleteAllChats completed", {
				userId: ctx.userId,
				count: chatIds.length,
			})

			return { deletedCount: chatIds.length }
		} catch (error) {
			logError("ChatService deleteAllChats error", error as Error, {
				userId: ctx.userId,
			})
			throw new InternalServerError("Failed to delete all chats", {
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Message Operations
	// =============================================================================

	/**
	 * Get messages for a chat with pagination.
	 *
	 * @param chatId - Chat ID
	 * @param pagination - Pagination parameters
	 * @param ctx - Repository context
	 * @returns Paginated messages
	 */
	async getMessages(
		chatId: string,
		pagination: PaginationParams,
		ctx: RepositoryContext,
	): Promise<PaginatedResult<Message>> {
		try {
			// Verify chat ownership first
			const chatResult = await chatRepository.findById(chatId, ctx)
			if (!chatResult) {
				throw new NotFoundError("Chat", chatId)
			}

			if (chatResult.userId !== ctx.userId) {
				throw new ForbiddenError(
					"You do not have access to this chat",
					{
						chatId,
						userId: ctx.userId,
					},
				)
			}

			// Get messages with pagination
			// Note: startingAfter and endingBefore cursor pagination can be added later
			const { limit } = pagination
			const extendedLimit = limit + 1

			const conditions: Array<ReturnType<typeof eq>> = [
				eq(message.chatId, chatId),
			]

			// Build query
			const results = await db
				.select()
				.from(message)
				.where(and(...conditions))
				.orderBy(message.createdAt)
				.limit(extendedLimit)

			// Determine if there are more items
			const hasMore = results.length > limit
			const items = (
				hasMore ? results.slice(0, limit) : results
			) as Message[]

			return { items, hasMore }
		} catch (error) {
			if (
				error instanceof NotFoundError ||
				error instanceof ForbiddenError
			) {
				throw error
			}
			logError("ChatService getMessages error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to get messages", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Vote Operations
	// =============================================================================

	/**
	 * Vote on a message (upvote/downvote).
	 *
	 * @param chatId - Chat ID
	 * @param messageId - Message ID
	 * @param userId - User ID
	 * @param isUpvoted - True for upvote, false for downvote
	 * @returns The created/updated vote
	 */
	async voteMessage(
		chatId: string,
		messageId: string,
		userId: string,
		isUpvoted: boolean,
	): Promise<Vote> {
		try {
			// Use upsert pattern
			const [result] = await db
				.insert(vote)
				.values({
					chatId,
					messageId,
					userId,
					isUpvoted,
				})
				.onConflictDoUpdate({
					target: [vote.chatId, vote.messageId, vote.userId],
					set: { isUpvoted },
				})
				.returning()

			logDebug("ChatService voteMessage completed", {
				chatId,
				messageId,
				userId,
				isUpvoted,
			})

			if (!result) {
				throw new InternalServerError(
					"Failed to vote on message - no result returned",
				)
			}

			return result
		} catch (error) {
			logError("ChatService voteMessage error", error as Error, {
				chatId,
				messageId,
				userId,
			})
			throw new InternalServerError("Failed to vote on message", {
				error: (error as Error).message,
			})
		}
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of ChatService.
 * Use this for all chat-related operations.
 */
export const chatService = new ChatService()
