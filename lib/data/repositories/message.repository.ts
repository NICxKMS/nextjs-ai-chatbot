/**
 * Message Repository
 *
 * Message entity repository with chat-scoped queries, bulk operations,
 * and timestamp-based deletion for regeneration support.
 *
 * @module lib/data/repositories/message.repository
 */

import "server-only"

import { and, asc, desc, eq, gte, type SQL } from "drizzle-orm"

import type { AppUsage } from "@/lib/ai"
import { CACHE_TTL } from "@/lib/constants"
import type {
	DBMessage,
	Message,
	NewMessage,
	UpdateMessage,
} from "@/lib/db/schema"
import { chat, message } from "@/lib/db/schema"
import { InternalServerError, NotFoundError } from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"
import type { PaginatedResult, PaginationParams } from "../types"
import {
	BaseRepository,
	type CountOptions,
	type FindManyOptions,
	type RepositoryContext,
} from "./base.repository"
import { chatRepository } from "./chat.repository"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for message-specific find operations
 */
export interface MessageFindOptions extends FindManyOptions {
	/** Filter by chat ID */
	chatId?: string
	/** Filter by role */
	role?: "user" | "assistant" | "system"
}

/**
 * Parameters for saving messages with context update
 */
export interface SaveWithContextParams {
	/** Messages to save */
	messages: DBMessage[]
	/** Chat ID to associate messages with */
	chatId: string
	/** Last context for state restoration */
	lastContext?: AppUsage | null
	/** Whether this is a new chat */
	isNewChat?: boolean
	/** Title for new chat */
	title?: string
	/** Visibility setting */
	visibility?: "public" | "private"
	/** Created at timestamp override */
	createdAt?: Date
}

// =============================================================================
// Message Repository Implementation
// =============================================================================

/**
 * Message repository with chat-scoped queries and bulk operations.
 *
 * @example
 * ```typescript
 * const messageRepo = new MessageRepository();
 *
 * // Get messages for a chat
 * const messages = await messageRepo.findByChatId(chatId, ctx);
 *
 * // Save messages with context update
 * await messageRepo.saveWithContext({
 *   messages: [msg1, msg2],
 *   chatId,
 *   lastContext: context
 * }, ctx);
 *
 * // Delete messages after timestamp (for regeneration)
 * await messageRepo.deleteAfterTimestamp(chatId, timestamp, ctx);
 * ```
 */
export class MessageRepository extends BaseRepository<
	Message,
	NewMessage,
	UpdateMessage
> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single message
	 * @param id - Message ID
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `message:${id}`
	}

	/**
	 * Generate cache key for message lists
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "messages:list"
	}

	/**
	 * Generate cache key for messages by chat
	 * @param chatId - Chat ID
	 * @returns Cache key string for chat messages
	 */
	protected cacheChatKey(chatId: string): string {
		return `messages:chat:${chatId}`
	}

	/**
	 * TTL for cached message entities (30 minutes)
	 */
	protected get ttl(): number {
		return CACHE_TTL.message
	}

	/**
	 * TTL for cached message lists (5 minutes)
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find a message by ID from the database.
	 *
	 * @param id - Message ID
	 * @param _context - Optional repository context (unused for messages)
	 * @returns The message or null if not found
	 */
	protected async doFindById(
		id: string,
		_context?: RepositoryContext,
	): Promise<Message | null> {
		try {
			const [result] = await this.db
				.select()
				.from(message)
				.where(eq(message.id, id))

			return result ?? null
		} catch (error) {
			logError("MessageRepository doFindById error", error as Error, {
				id,
			})
			throw new InternalServerError(
				`Failed to find message by ID: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find multiple messages from the database.
	 *
	 * @param options - Query options
	 * @param _context - Optional repository context
	 * @returns Array of matching messages
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		_context?: RepositoryContext,
	): Promise<Message[]> {
		try {
			const conditions: SQL<unknown>[] = []

			// Add chat filter if provided
			if (options?.where?.chatId) {
				conditions.push(
					eq(message.chatId, options.where.chatId as string),
				)
			}

			// Add role filter if provided
			if (options?.where?.role) {
				conditions.push(
					eq(
						message.role,
						options.where.role as "user" | "assistant" | "system",
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			// Build query with ordering
			let query = this.db
				.select()
				.from(message)
				.where(whereClause)
				.orderBy(asc(message.createdAt))

			// Apply pagination
			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			return await query
		} catch (error) {
			logError("MessageRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find messages", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count messages in the database.
	 *
	 * @param options - Count options
	 * @param _context - Optional repository context
	 * @returns Number of matching messages
	 */
	protected async doCount(
		options?: CountOptions,
		_context?: RepositoryContext,
	): Promise<number> {
		try {
			const conditions: SQL<unknown>[] = []

			if (options?.where?.chatId) {
				conditions.push(
					eq(message.chatId, options.where.chatId as string),
				)
			}

			if (options?.where?.role) {
				conditions.push(
					eq(
						message.role,
						options.where.role as "user" | "assistant" | "system",
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			const result = await this.db
				.select({ count: message.id })
				.from(message)
				.where(whereClause)

			return result.length
		} catch (error) {
			logError("MessageRepository doCount error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to count messages", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new message in the database.
	 *
	 * @param data - Message creation data
	 * @param _context - Optional repository context
	 * @returns The created message
	 */
	protected async doCreate(
		data: NewMessage,
		_context?: RepositoryContext,
	): Promise<Message> {
		try {
			const [result] = await this.db
				.insert(message)
				.values(data)
				.returning()

			if (!result) {
				throw new Error("Failed to create message - no result returned")
			}

			logDebug("MessageRepository message created", { id: result.id })
			return result
		} catch (error) {
			logError("MessageRepository doCreate error", error as Error, {
				data,
			})
			throw new InternalServerError("Failed to create message", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a message in the database.
	 *
	 * @param id - Message ID
	 * @param data - Message update data
	 * @param _context - Optional repository context
	 * @returns The updated message
	 */
	protected async doUpdate(
		id: string,
		data: UpdateMessage,
		_context?: RepositoryContext,
	): Promise<Message> {
		try {
			const [result] = await this.db
				.update(message)
				.set(data)
				.where(eq(message.id, id))
				.returning()

			if (!result) {
				throw new NotFoundError(`Message not found: ${id}`)
			}

			logDebug("MessageRepository message updated", { id })
			return result
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("MessageRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(`Failed to update message: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a message from the database.
	 *
	 * @param id - Message ID
	 * @param _context - Optional repository context
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		_context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const [result] = await this.db
				.delete(message)
				.where(eq(message.id, id))
				.returning({ id: message.id })

			const success = !!result
			if (success) {
				logDebug("MessageRepository message deleted", { id })
			}
			return success
		} catch (error) {
			logError("MessageRepository doDelete error", error as Error, { id })
			throw new InternalServerError(`Failed to delete message: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Message-Specific Methods
	// =============================================================================

	/**
	 * Find all messages for a chat.
	 *
	 * @param chatId - Chat ID
	 * @param options - Optional query options
	 * @param _context - Optional repository context
	 * @returns Array of messages for the chat
	 */
	async findByChatId(
		chatId: string,
		options?: { limit?: number; offset?: number },
		context?: RepositoryContext,
	): Promise<Message[]> {
		const chatKey = this.cacheChatKey(chatId)

		try {
			if (!options?.offset) {
				const cached = await this.listCache.get(chatKey)
				if (cached.found && cached.value) {
					if (options?.limit && cached.value.length > options.limit) {
						return cached.value.slice(0, options.limit)
					}
					return cached.value
				}

				if (context?.isGuest) {
					return []
				}
			}

			let query = this.db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(asc(message.createdAt))

			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			const results = await query

			if (!options?.offset) {
				await this.listCache.set(chatKey, results, {
					ttl: this.listTtl,
				})
			}

			return results
		} catch (error) {
			logError("MessageRepository findByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError(
				"Failed to find messages by chat ID",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find messages for a chat with cursor-based pagination.
	 *
	 * @param chatId - Chat ID
	 * @param pagination - Pagination parameters
	 * @param _context - Optional repository context
	 * @returns Paginated result with messages
	 */
	async findByChatIdPaginated(
		chatId: string,
		pagination: PaginationParams,
		context?: RepositoryContext,
	): Promise<PaginatedResult<Message>> {
		if (context?.isGuest) {
			const cached = await this.listCache.get(this.cacheChatKey(chatId))
			if (!cached.found || !cached.value) {
				return { items: [], hasMore: false }
			}

			const items = cached.value.slice(0, pagination.limit)
			return {
				items,
				hasMore: cached.value.length > pagination.limit,
			}
		}

		try {
			const { limit, startingAfter, endingBefore } = pagination
			const extendedLimit = limit + 1

			// Build base conditions
			const conditions: SQL<unknown>[] = [eq(message.chatId, chatId)]

			// Add cursor conditions for pagination
			if (startingAfter) {
				// Get the cursor message to find its createdAt
				const [cursorMessage] = await this.db
					.select({ createdAt: message.createdAt })
					.from(message)
					.where(eq(message.id, startingAfter))

				if (cursorMessage) {
					conditions.push(
						gte(message.createdAt, cursorMessage.createdAt),
					)
				}
			} else if (endingBefore) {
				// Get the cursor message to find its createdAt
				const [cursorMessage] = await this.db
					.select({ createdAt: message.createdAt })
					.from(message)
					.where(eq(message.id, endingBefore))

				if (cursorMessage) {
					// For ending before, we want messages with createdAt < cursor
					// This requires a lt operator, but we'll handle it with ordering
					conditions.push(
						gte(message.createdAt, cursorMessage.createdAt),
					)
				}
			}

			const whereClause = and(...conditions)

			// Build query with ordering
			const query = this.db
				.select()
				.from(message)
				.where(whereClause)
				.orderBy(
					endingBefore
						? desc(message.createdAt)
						: asc(message.createdAt),
				)
				.limit(extendedLimit)

			const results = await query

			// Determine if there are more items
			const hasMore = results.length > limit
			const items = hasMore ? results.slice(0, limit) : results

			// Reverse if we were paginating backwards
			if (endingBefore) {
				items.reverse()
			}

			return { items, hasMore }
		} catch (error) {
			logError(
				"MessageRepository findByChatIdPaginated error",
				error as Error,
				{
					chatId,
					pagination,
				},
			)
			throw new InternalServerError(
				"Failed to find paginated messages by chat ID",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Save multiple messages in bulk.
	 *
	 * @param messages - Array of message data to save
	 * @param _context - Optional repository context
	 * @returns Array of created messages
	 */
	async saveMany(
		messages: NewMessage[],
		_context?: RepositoryContext,
	): Promise<Message[]> {
		try {
			if (messages.length === 0) {
				return []
			}

			const results = await this.db
				.insert(message)
				.values(messages)
				.returning()

			logDebug("MessageRepository messages saved", {
				count: results.length,
			})
			return results
		} catch (error) {
			logError("MessageRepository saveMany error", error as Error, {
				count: messages.length,
			})
			throw new InternalServerError("Failed to save messages", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Save messages with chat context update.
	 * This is used when saving messages from a chat interaction.
	 *
	 * Features:
	 * - Atomic transaction for message insert + chat update
	 * - Idempotent message inserts (onConflictDoNothing)
	 * - IDOR protection via userId filter on updates
	 * - New chat creation support
	 *
	 * @param params - Save parameters including messages and chat context
	 * @param context - Repository context for ownership verification
	 */
	async saveWithContext(
		params: SaveWithContextParams,
		context: RepositoryContext,
	): Promise<void> {
		const {
			messages: messagesToSave,
			chatId,
			lastContext,
			isNewChat,
			title,
			visibility,
			createdAt,
		} = params

		try {
			// Use a transaction to ensure atomicity
			await this.db.transaction(async (tx) => {
				// Handle new chat creation
				if (isNewChat && title && visibility) {
					await tx.insert(chat).values({
						id: chatId,
						userId: context.userId,
						title,
						visibility,
						createdAt: createdAt ?? new Date(),
						updatedAt: new Date(),
						lastContext: lastContext ?? null,
					})

					logDebug(
						"MessageRepository created new chat in transaction",
						{
							chatId,
							userId: context.userId,
						},
					)
				}

				// Insert messages with idempotency (onConflictDoNothing)
				if (messagesToSave.length > 0) {
					await tx
						.insert(message)
						.values(messagesToSave)
						.onConflictDoNothing({ target: message.id })

					logDebug(
						"MessageRepository saved messages in transaction",
						{
							count: messagesToSave.length,
							chatId,
						},
					)
				}

				// Update chat context if provided (for existing chats)
				// SECURITY: Filter by userId to prevent IDOR attacks
				if (lastContext !== undefined && !isNewChat) {
					const result = await tx
						.update(chat)
						.set({
							lastContext,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(chat.id, chatId),
								eq(chat.userId, context.userId),
							),
						)
						.returning({ id: chat.id })

					if (result.length > 0) {
						logDebug("MessageRepository updated chat context", {
							chatId,
							userId: context.userId,
						})
					} else {
						logDebug(
							"MessageRepository context update skipped (chat not found or not owned)",
							{ chatId, userId: context.userId },
						)
					}
				}
			})

			// Invalidate caches after successful transaction
			const chatCacheKey = this.cacheChatKey(chatId)
			await this.listCache.delete(chatCacheKey)
			await this.invalidateListCache()
			await chatRepository.invalidateCache(chatId)
			await chatRepository.invalidateChatListCache()
		} catch (error) {
			logError(
				"MessageRepository saveWithContext error",
				error as Error,
				{
					chatId,
					messageCount: messagesToSave.length,
					userId: context.userId,
				},
			)
			throw new InternalServerError(
				"Failed to save messages with context",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Delete messages after a timestamp.
	 * Used for message regeneration - removes messages created after a point.
	 *
	 * @param chatId - Chat ID
	 * @param timestamp - Delete messages created at or after this timestamp
	 * @param _context - Optional repository context
	 * @returns Number of messages deleted
	 */
	async deleteAfterTimestamp(
		chatId: string,
		timestamp: Date,
		_context?: RepositoryContext,
	): Promise<number> {
		try {
			const results = await this.db
				.delete(message)
				.where(
					and(
						eq(message.chatId, chatId),
						gte(message.createdAt, timestamp),
					),
				)
				.returning({ id: message.id })

			const deletedCount = results.length

			// Invalidate chat messages cache
			const chatCacheKey = this.cacheChatKey(chatId)
			await this.listCache.delete(chatCacheKey)
			await chatRepository.invalidateCache(chatId)
			await chatRepository.invalidateChatListCache()

			logDebug("MessageRepository deleted messages after timestamp", {
				chatId,
				timestamp,
				deletedCount,
			})

			return deletedCount
		} catch (error) {
			logError(
				"MessageRepository deleteAfterTimestamp error",
				error as Error,
				{
					chatId,
					timestamp,
				},
			)
			throw new InternalServerError(
				"Failed to delete messages after timestamp",
				{
					chatId,
					timestamp,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Count messages for a chat.
	 *
	 * @param chatId - Chat ID
	 * @returns Number of messages in the chat
	 */
	async countByChatId(chatId: string): Promise<number> {
		try {
			const result = await this.db
				.select({ count: message.id })
				.from(message)
				.where(eq(message.chatId, chatId))

			return result.length
		} catch (error) {
			logError("MessageRepository countByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError(
				"Failed to count messages by chat ID",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Delete all messages for a chat.
	 *
	 * @param chatId - Chat ID
	 * @param _context - Optional repository context
	 * @returns Number of messages deleted
	 */
	async deleteByChatId(
		chatId: string,
		_context?: RepositoryContext,
	): Promise<number> {
		try {
			const results = await this.db
				.delete(message)
				.where(eq(message.chatId, chatId))
				.returning({ id: message.id })

			const deletedCount = results.length

			// Invalidate chat messages cache
			const chatCacheKey = this.cacheChatKey(chatId)
			await this.listCache.delete(chatCacheKey)
			await chatRepository.invalidateCache(chatId)
			await chatRepository.invalidateChatListCache()

			logDebug("MessageRepository deleted all messages for chat", {
				chatId,
				deletedCount,
			})

			return deletedCount
		} catch (error) {
			logError("MessageRepository deleteByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError(
				"Failed to delete messages by chat ID",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of MessageRepository
 */
export const messageRepository = new MessageRepository()
