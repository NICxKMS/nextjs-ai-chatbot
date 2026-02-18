/**
 * Chat Repository
 *
 * Chat entity repository with user-scoped queries, visibility controls,
 * and pagination. Extends BaseRepository with cache-through strategy.
 *
 * @module lib/data/repositories/chat.repository
 */

import "server-only"

import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	ilike,
	lt,
	lte,
	type SQL,
} from "drizzle-orm"

import type { AppUsage } from "@/lib/ai"
import { CACHE_TTL } from "@/lib/constants"
import type { Chat, Message, NewChat, UpdateChat } from "@/lib/db/schema"
import { chat, message } from "@/lib/db/schema"
import { InternalServerError, NotFoundError } from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

import {
	BaseRepository,
	type CountOptions,
	type FindManyOptions,
	type RepositoryContext,
} from "./base.repository"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for chat-specific find operations
 */
export interface ChatFindOptions extends FindManyOptions {
	/** Filter by user ID */
	userId?: string
	/** Filter by visibility */
	visibility?: "public" | "private"
}

/**
 * Pagination parameters for cursor-based pagination
 */
export interface PaginationParams {
	/** Maximum number of items to return */
	limit: number
	/** Cursor for forward pagination - return items after this ID */
	startingAfter?: string | null
	/** Cursor for backward pagination - return items before this ID */
	endingBefore?: string | null
	/** Search query for title filtering (case-insensitive ILIKE) */
	searchQuery?: string | null
	/** Date filter - include chats from this date onwards */
	fromDate?: Date | null
	/** Date filter - include chats up to this date */
	toDate?: Date | null
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
	/** Array of items for the current page */
	items: T[]
	/** Whether there are more items available */
	hasMore: boolean
}

/**
 * Chat with messages loaded
 */
export interface ChatWithMessages {
	/** Chat metadata */
	chat: Chat
	/** Messages belonging to the chat */
	messages: Message[]
}

// =============================================================================
// Chat Repository Implementation
// =============================================================================

/**
 * Chat repository with user-scoped queries and visibility controls.
 *
 * @example
 * ```typescript
 * const chatRepo = new ChatRepository();
 *
 * // Get user's chats with pagination
 * const result = await chatRepo.findByUserId(userId, { limit: 10 });
 *
 * // Get chat with messages
 * const chatWithMessages = await chatRepo.findWithMessages(chatId, ctx);
 * ```
 */
export class ChatRepository extends BaseRepository<Chat, NewChat, UpdateChat> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single chat
	 * @param id - Chat ID
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `chat:${id}`
	}

	/**
	 * Generate cache key for chat lists
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "chats:list"
	}

	/**
	 * TTL for cached chat entities (1 hour)
	 */
	protected get ttl(): number {
		return CACHE_TTL.chat
	}

	/**
	 * TTL for cached chat lists (5 minutes)
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find a chat by ID from the database.
	 * Includes user ownership check when context is provided.
	 *
	 * @param id - Chat ID
	 * @param context - Optional repository context for ownership check
	 * @returns The chat or null if not found
	 */
	protected async doFindById(
		id: string,
		context?: RepositoryContext,
	): Promise<Chat | null> {
		try {
			const conditions = context
				? and(eq(chat.id, id), eq(chat.userId, context.userId))
				: eq(chat.id, id)

			const [result] = await this.db.select().from(chat).where(conditions)

			return result ?? null
		} catch (error) {
			logError("ChatRepository doFindById error", error as Error, { id })
			throw new InternalServerError(`Failed to find chat by ID: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Find multiple chats from the database.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching chats
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<Chat[]> {
		try {
			const conditions: SQL<unknown>[] = []

			// Add user filter if provided in options or context
			if (options?.where?.userId) {
				conditions.push(eq(chat.userId, options.where.userId as string))
			} else if (context?.userId) {
				conditions.push(eq(chat.userId, context.userId))
			}

			// Add visibility filter if provided
			if (options?.where?.visibility) {
				conditions.push(
					eq(
						chat.visibility,
						options.where.visibility as "public" | "private",
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			// Build query with ordering
			let query = this.db
				.select()
				.from(chat)
				.where(whereClause)
				.orderBy(desc(chat.createdAt))

			// Apply pagination
			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			return await query
		} catch (error) {
			logError("ChatRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find chats", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count chats in the database.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching chats
	 */
	protected async doCount(
		options?: CountOptions,
		context?: RepositoryContext,
	): Promise<number> {
		try {
			const conditions: SQL<unknown>[] = []

			if (options?.where?.userId) {
				conditions.push(eq(chat.userId, options.where.userId as string))
			} else if (context?.userId) {
				conditions.push(eq(chat.userId, context.userId))
			}

			if (options?.where?.visibility) {
				conditions.push(
					eq(
						chat.visibility,
						options.where.visibility as "public" | "private",
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			const result = await this.db
				.select({ count: chat.id })
				.from(chat)
				.where(whereClause)

			return result.length
		} catch (error) {
			logError("ChatRepository doCount error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to count chats", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new chat in the database.
	 *
	 * @param data - Chat creation data
	 * @param context - Optional repository context
	 * @returns The created chat
	 */
	protected async doCreate(
		data: NewChat,
		context?: RepositoryContext,
	): Promise<Chat> {
		try {
			// Use context userId if not provided in data
			const chatData = {
				...data,
				userId: data.userId ?? context?.userId,
			}

			const [result] = await this.db
				.insert(chat)
				.values(chatData)
				.returning()

			if (!result) {
				throw new Error("Failed to create chat - no result returned")
			}

			logDebug("ChatRepository chat created", { id: result.id })
			return result
		} catch (error) {
			logError("ChatRepository doCreate error", error as Error, { data })
			throw new InternalServerError("Failed to create chat", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a chat in the database.
	 *
	 * @param id - Chat ID
	 * @param data - Chat update data
	 * @param context - Optional repository context for ownership check
	 * @returns The updated chat
	 */
	protected async doUpdate(
		id: string,
		data: UpdateChat,
		context?: RepositoryContext,
	): Promise<Chat> {
		try {
			const conditions = context
				? and(eq(chat.id, id), eq(chat.userId, context.userId))
				: eq(chat.id, id)

			const [result] = await this.db
				.update(chat)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(conditions)
				.returning()

			if (!result) {
				throw new NotFoundError(`Chat not found: ${id}`)
			}

			logDebug("ChatRepository chat updated", { id })
			return result
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ChatRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(`Failed to update chat: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a chat from the database.
	 *
	 * @param id - Chat ID
	 * @param context - Optional repository context for ownership check
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const conditions = context
				? and(eq(chat.id, id), eq(chat.userId, context.userId))
				: eq(chat.id, id)

			const [result] = await this.db
				.delete(chat)
				.where(conditions)
				.returning({ id: chat.id })

			const success = !!result
			if (success) {
				logDebug("ChatRepository chat deleted", { id })
			}
			return success
		} catch (error) {
			logError("ChatRepository doDelete error", error as Error, { id })
			throw new InternalServerError(`Failed to delete chat: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Chat-Specific Methods
	// =============================================================================

	/**
	 * Find chats by user ID with cursor-based pagination.
	 *
	 * @param userId - User ID
	 * @param pagination - Pagination parameters
	 * @param _context - Optional repository context (unused but kept for API consistency)
	 * @returns Paginated result with chats
	 */
	async findByUserId(
		userId: string,
		pagination: PaginationParams,
		_context?: RepositoryContext,
	): Promise<PaginatedResult<Chat>> {
		try {
			const {
				limit,
				startingAfter,
				endingBefore,
				searchQuery,
				fromDate,
				toDate,
			} = pagination
			const extendedLimit = limit + 1

			// Build base conditions
			const conditions: SQL<unknown>[] = [eq(chat.userId, userId)]

			// Add title search filter (ILIKE for case-insensitive matching)
			if (searchQuery && searchQuery.trim() !== "") {
				conditions.push(ilike(chat.title, `%${searchQuery.trim()}%`))
			}

			// Add date range filters on updatedAt
			if (fromDate) {
				conditions.push(gte(chat.updatedAt, fromDate))
			}
			if (toDate) {
				// Include the entire end date by adding 23:59:59.999
				const endOfDay = new Date(toDate)
				endOfDay.setHours(23, 59, 59, 999)
				conditions.push(lte(chat.updatedAt, endOfDay))
			}

			// Add cursor conditions for pagination
			if (startingAfter) {
				// Get the cursor chat to find its updatedAt
				const [cursorChat] = await this.db
					.select({ updatedAt: chat.updatedAt })
					.from(chat)
					.where(eq(chat.id, startingAfter))

				if (cursorChat) {
					conditions.push(lt(chat.updatedAt, cursorChat.updatedAt))
				}
			} else if (endingBefore) {
				// Get the cursor chat to find its updatedAt
				const [cursorChat] = await this.db
					.select({ updatedAt: chat.updatedAt })
					.from(chat)
					.where(eq(chat.id, endingBefore))

				if (cursorChat) {
					conditions.push(gt(chat.updatedAt, cursorChat.updatedAt))
				}
			}

			const whereClause = and(...conditions)

			// Build query with ordering by updatedAt DESC (most recent first)
			const query = this.db
				.select()
				.from(chat)
				.where(whereClause)
				.orderBy(
					endingBefore ? asc(chat.updatedAt) : desc(chat.updatedAt),
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
			logError("ChatRepository findByUserId error", error as Error, {
				userId,
				pagination,
			})
			throw new InternalServerError("Failed to find chats by user ID", {
				userId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Find a chat with its messages loaded.
	 *
	 * @param chatId - Chat ID
	 * @param context - Repository context for ownership check
	 * @returns Chat with messages or null if not found
	 */
	async findWithMessages(
		chatId: string,
		context: RepositoryContext,
	): Promise<ChatWithMessages | null> {
		try {
			// First verify chat exists and user has access
			const chatResult = await this.doFindById(chatId, context)
			if (!chatResult) {
				return null
			}

			// Fetch messages for the chat
			const messages = await this.db
				.select()
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(asc(message.createdAt))

			return {
				chat: chatResult,
				messages: messages as Message[],
			}
		} catch (error) {
			logError("ChatRepository findWithMessages error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to find chat with messages", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a chat's title.
	 *
	 * @param chatId - Chat ID
	 * @param title - New title
	 * @param context - Repository context for ownership check
	 * @returns The updated chat
	 */
	async updateTitle(
		chatId: string,
		title: string,
		context: RepositoryContext,
	): Promise<Chat> {
		return this.update(chatId, { title }, context)
	}

	/**
	 * Update a chat's visibility.
	 *
	 * @param chatId - Chat ID
	 * @param visibility - New visibility setting
	 * @param context - Repository context for ownership check
	 * @returns The updated chat
	 */
	async updateVisibility(
		chatId: string,
		visibility: "public" | "private",
		context: RepositoryContext,
	): Promise<Chat> {
		return this.update(chatId, { visibility }, context)
	}

	/**
	 * Update a chat's last context (for state restoration).
	 *
	 * @param chatId - Chat ID
	 * @param lastContext - Context data to store
	 * @param context - Repository context for ownership check
	 * @returns The updated chat
	 */
	async updateContext(
		chatId: string,
		lastContext: AppUsage | null,
		context: RepositoryContext,
	): Promise<Chat> {
		return this.update(chatId, { lastContext }, context)
	}

	/**
	 * Delete all chats for a user.
	 *
	 * @param userId - User ID
	 * @param context - Repository context for ownership verification
	 * @returns Number of chats deleted
	 */
	async deleteAllForUser(
		userId: string,
		context: RepositoryContext,
	): Promise<{ deletedCount: number }> {
		try {
			// Verify context matches the user whose chats are being deleted
			if (context.userId !== userId) {
				throw new Error(
					"Cannot delete chats for a different user than the authenticated user",
				)
			}

			const results = await this.db
				.delete(chat)
				.where(eq(chat.userId, userId))
				.returning({ id: chat.id })

			const deletedCount = results.length

			// Invalidate all caches
			await this.invalidateAllCaches()

			logDebug("ChatRepository deleted all chats for user", {
				userId,
				deletedCount,
			})

			return { deletedCount }
		} catch (error) {
			logError("ChatRepository deleteAllForUser error", error as Error, {
				userId,
			})
			throw new InternalServerError(
				"Failed to delete all chats for user",
				{
					userId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find a public chat by ID (no ownership check).
	 * Used for sharing public chats.
	 *
	 * @param chatId - Chat ID
	 * @returns The chat or null if not found or not public
	 */
	async findPublicChat(chatId: string): Promise<Chat | null> {
		try {
			const [result] = await this.db
				.select()
				.from(chat)
				.where(and(eq(chat.id, chatId), eq(chat.visibility, "public")))

			return result ?? null
		} catch (error) {
			logError("ChatRepository findPublicChat error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to find public chat", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Check if a user owns a chat.
	 *
	 * @param chatId - Chat ID
	 * @param userId - User ID to check
	 * @returns true if the user owns the chat
	 */
	async isOwner(chatId: string, userId: string): Promise<boolean> {
		try {
			const [result] = await this.db
				.select({ id: chat.id })
				.from(chat)
				.where(and(eq(chat.id, chatId), eq(chat.userId, userId)))

			return !!result
		} catch (error) {
			logError("ChatRepository isOwner error", error as Error, {
				chatId,
				userId,
			})
			return false
		}
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of ChatRepository
 */
export const chatRepository = new ChatRepository()
