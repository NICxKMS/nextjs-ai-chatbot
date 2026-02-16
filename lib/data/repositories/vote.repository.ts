/**
 * Vote Repository
 *
 * Vote entity repository for message voting with upsert support.
 * Uses composite primary key (chatId, messageId, userId) for unique votes.
 *
 * Key features:
 * - Upsert support via ON CONFLICT DO UPDATE
 * - Composite key operations (chatId + messageId + userId)
 * - Chat-scoped and message-scoped delete for cascading
 *
 * @module lib/data/repositories/vote.repository
 */

import "server-only"

import { and, eq } from "drizzle-orm"

import { CACHE_TTL } from "@/lib/constants"
import type { NewVote, Vote } from "@/lib/db/schema"
import { vote } from "@/lib/db/schema"
import { InternalServerError } from "@/lib/errors"
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
 * Vote entity with synthetic ID for repository pattern compatibility.
 * The composite primary key (chatId, messageId, userId) is combined into a single ID.
 */
interface VoteEntity extends Vote {
	id: string
}

/**
 * Parameters for upsert operation
 */
export interface UpsertVoteParams {
	/** Chat ID */
	chatId: string
	/** Message ID */
	messageId: string
	/** User ID */
	userId: string
	/** Vote direction (true = upvote, false = downvote) */
	isUpvoted: boolean
}

/**
 * Options for vote-specific find operations
 */
export interface VoteFindOptions extends FindManyOptions {
	/** Filter by chat ID */
	chatId?: string
	/** Filter by message ID */
	messageId?: string
	/** Filter by user ID */
	userId?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a synthetic ID from composite key components.
 * Format: `${chatId}:${messageId}:${userId}`
 *
 * @param chatId - Chat ID
 * @param messageId - Message ID
 * @param userId - User ID
 * @returns Synthetic ID string
 */
function generateVoteId(
	chatId: string,
	messageId: string,
	userId: string,
): string {
	return `${chatId}:${messageId}:${userId}`
}

/**
 * Parse a synthetic ID back into composite key components.
 *
 * @param id - Synthetic ID string
 * @returns Object with chatId, messageId, userId or null if invalid
 */
function parseVoteId(
	id: string,
): { chatId: string; messageId: string; userId: string } | null {
	const parts = id.split(":")
	if (parts.length !== 3) return null
	const [chatId, messageId, userId] = parts
	if (!chatId || !messageId || !userId) return null
	return { chatId, messageId, userId }
}

// =============================================================================
// Vote Repository Implementation
// =============================================================================

/**
 * Vote repository with upsert support and composite key operations.
 *
 * The Vote entity uses a composite primary key (chatId, messageId, userId),
 * which requires special handling in the repository pattern designed for
 * single-column primary keys.
 *
 * @example
 * ```typescript
 * const voteRepo = new VoteRepository();
 *
 * // Upsert a vote (create or update)
 * await voteRepo.upsert({
 *   chatId: 'chat-123',
 *   messageId: 'msg-456',
 *   userId: 'user-789',
 *   isUpvoted: true
 * }, ctx);
 *
 * // Find a specific vote
 * const vote = await voteRepo.findByIds('chat-123', 'msg-456', 'user-789', ctx);
 *
 * // Get all votes for a chat
 * const votes = await voteRepo.findByChatId('chat-123', ctx);
 *
 * // Delete all votes for a chat (cascade)
 * await voteRepo.deleteByChatId('chat-123');
 * ```
 */
export class VoteRepository extends BaseRepository<
	VoteEntity,
	NewVote,
	Partial<NewVote>
> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single vote.
	 * Uses the synthetic ID format: `vote:${chatId}:${messageId}:${userId}`
	 *
	 * @param id - Synthetic vote ID (chatId:messageId:userId)
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `vote:${id}`
	}

	/**
	 * Generate cache key for vote lists.
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "votes:list"
	}

	/**
	 * Generate cache key for votes by chat.
	 * @param chatId - Chat ID
	 * @returns Cache key string for chat votes
	 */
	protected cacheChatKey(chatId: string): string {
		return `votes:chat:${chatId}`
	}

	/**
	 * TTL for cached vote entities (1 hour)
	 */
	protected get ttl(): number {
		return CACHE_TTL.default
	}

	/**
	 * TTL for cached vote lists (5 minutes)
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list ?? 300
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find a vote by synthetic ID from the database.
	 *
	 * @param id - Synthetic vote ID (chatId:messageId:userId)
	 * @param _context - Optional repository context (unused for votes)
	 * @returns The vote with synthetic ID or null if not found
	 */
	protected async doFindById(
		id: string,
		_context?: RepositoryContext,
	): Promise<VoteEntity | null> {
		try {
			const parsed = parseVoteId(id)
			if (!parsed) {
				logDebug("VoteRepository invalid synthetic ID", { id })
				return null
			}

			const { chatId, messageId, userId } = parsed
			const [result] = await this.db
				.select()
				.from(vote)
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId),
					),
				)

			if (!result) return null

			// Add synthetic ID for repository pattern compatibility
			return { ...result, id }
		} catch (error) {
			logError("VoteRepository doFindById error", error as Error, { id })
			throw new InternalServerError(`Failed to find vote by ID: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Find multiple votes from the database.
	 *
	 * @param options - Query options
	 * @param _context - Optional repository context
	 * @returns Array of matching votes with synthetic IDs
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		_context?: RepositoryContext,
	): Promise<VoteEntity[]> {
		try {
			const conditions = []

			if (options?.where?.chatId) {
				conditions.push(eq(vote.chatId, options.where.chatId as string))
			}
			if (options?.where?.messageId) {
				conditions.push(
					eq(vote.messageId, options.where.messageId as string),
				)
			}
			if (options?.where?.userId) {
				conditions.push(eq(vote.userId, options.where.userId as string))
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			let query = this.db.select().from(vote).where(whereClause)

			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			const results = await query

			// Add synthetic IDs
			return results.map((v) => ({
				...v,
				id: generateVoteId(v.chatId, v.messageId, v.userId),
			}))
		} catch (error) {
			logError("VoteRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find votes", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count votes in the database.
	 *
	 * @param options - Count options
	 * @param _context - Optional repository context
	 * @returns Number of matching votes
	 */
	protected async doCount(
		options?: CountOptions,
		_context?: RepositoryContext,
	): Promise<number> {
		try {
			const conditions = []

			if (options?.where?.chatId) {
				conditions.push(eq(vote.chatId, options.where.chatId as string))
			}
			if (options?.where?.messageId) {
				conditions.push(
					eq(vote.messageId, options.where.messageId as string),
				)
			}
			if (options?.where?.userId) {
				conditions.push(eq(vote.userId, options.where.userId as string))
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			const results = await this.db.select().from(vote).where(whereClause)

			return results.length
		} catch (error) {
			logError("VoteRepository doCount error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to count votes", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new vote in the database.
	 *
	 * @param data - Vote creation data
	 * @param _context - Optional repository context
	 * @returns The created vote with synthetic ID
	 */
	protected async doCreate(
		data: NewVote,
		_context?: RepositoryContext,
	): Promise<VoteEntity> {
		try {
			const [result] = await this.db.insert(vote).values(data).returning()

			if (!result) {
				throw new Error("Failed to create vote - no result returned")
			}

			logDebug("VoteRepository vote created", {
				chatId: result.chatId,
				messageId: result.messageId,
				userId: result.userId,
			})

			return {
				...result,
				id: generateVoteId(
					result.chatId,
					result.messageId,
					result.userId,
				),
			}
		} catch (error) {
			logError("VoteRepository doCreate error", error as Error, { data })
			throw new InternalServerError("Failed to create vote", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a vote in the database.
	 *
	 * @param id - Synthetic vote ID (chatId:messageId:userId)
	 * @param data - Vote update data
	 * @param _context - Optional repository context
	 * @returns The updated vote with synthetic ID
	 */
	protected async doUpdate(
		id: string,
		data: Partial<NewVote>,
		_context?: RepositoryContext,
	): Promise<VoteEntity> {
		try {
			const parsed = parseVoteId(id)
			if (!parsed) {
				throw new InternalServerError(`Invalid vote ID format: ${id}`)
			}

			const { chatId, messageId, userId } = parsed

			const [result] = await this.db
				.update(vote)
				.set(data)
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId),
					),
				)
				.returning()

			if (!result) {
				throw new InternalServerError(`Vote not found: ${id}`)
			}

			logDebug("VoteRepository vote updated", { id })

			return {
				...result,
				id: generateVoteId(
					result.chatId,
					result.messageId,
					result.userId,
				),
			}
		} catch (error) {
			logError("VoteRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(`Failed to update vote: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a vote from the database.
	 *
	 * @param id - Synthetic vote ID (chatId:messageId:userId)
	 * @param _context - Optional repository context
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		_context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const parsed = parseVoteId(id)
			if (!parsed) {
				logDebug("VoteRepository invalid synthetic ID for delete", {
					id,
				})
				return false
			}

			const { chatId, messageId, userId } = parsed

			const [result] = await this.db
				.delete(vote)
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId),
					),
				)
				.returning({ chatId: vote.chatId })

			const success = !!result
			if (success) {
				logDebug("VoteRepository vote deleted", { id })
			}
			return success
		} catch (error) {
			logError("VoteRepository doDelete error", error as Error, { id })
			throw new InternalServerError(`Failed to delete vote: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Vote-Specific Methods
	// =============================================================================

	/**
	 * Find a vote by its composite key components.
	 *
	 * @param chatId - Chat ID
	 * @param messageId - Message ID
	 * @param userId - User ID
	 * @param _context - Optional repository context
	 * @returns The vote or null if not found
	 */
	async findByIds(
		chatId: string,
		messageId: string,
		userId: string,
		_context?: RepositoryContext,
	): Promise<Vote | null> {
		try {
			const [result] = await this.db
				.select()
				.from(vote)
				.where(
					and(
						eq(vote.chatId, chatId),
						eq(vote.messageId, messageId),
						eq(vote.userId, userId),
					),
				)

			return result ?? null
		} catch (error) {
			logError("VoteRepository findByIds error", error as Error, {
				chatId,
				messageId,
				userId,
			})
			throw new InternalServerError(
				"Failed to find vote by composite key",
				{
					chatId,
					messageId,
					userId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Upsert a vote - create or update based on composite key.
	 * Uses PostgreSQL's ON CONFLICT for atomic upsert operation.
	 *
	 * @param params - Upsert parameters
	 * @param _context - Optional repository context
	 * @returns The upserted vote
	 */
	async upsert(
		params: UpsertVoteParams,
		_context?: RepositoryContext,
	): Promise<Vote> {
		try {
			const { chatId, messageId, userId, isUpvoted } = params

			// Use PostgreSQL's ON CONFLICT for atomic upsert
			const [result] = await this.db
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

			if (!result) {
				throw new Error("Failed to upsert vote - no result returned")
			}

			logDebug("VoteRepository vote upserted", {
				chatId,
				messageId,
				userId,
				isUpvoted,
			})

			// Invalidate relevant caches
			const syntheticId = generateVoteId(chatId, messageId, userId)
			await this.invalidateCache(syntheticId)
			await this.invalidateListCache()

			return result
		} catch (error) {
			logError("VoteRepository upsert error", error as Error, { params })
			throw new InternalServerError("Failed to upsert vote", {
				params,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Find all votes for a chat.
	 *
	 * @param chatId - Chat ID
	 * @param _context - Optional repository context
	 * @returns Array of votes for the chat
	 */
	async findByChatId(
		chatId: string,
		_context?: RepositoryContext,
	): Promise<Vote[]> {
		try {
			const results = await this.db
				.select()
				.from(vote)
				.where(eq(vote.chatId, chatId))

			return results
		} catch (error) {
			logError("VoteRepository findByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to find votes by chat ID", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete all votes for a chat.
	 * Used for cascade delete when a chat is deleted.
	 *
	 * @param chatId - Chat ID
	 * @returns Number of votes deleted
	 */
	async deleteByChatId(chatId: string): Promise<number> {
		try {
			const results = await this.db
				.delete(vote)
				.where(eq(vote.chatId, chatId))
				.returning({ chatId: vote.chatId })

			const count = results.length
			if (count > 0) {
				logDebug("VoteRepository votes deleted by chat ID", {
					chatId,
					count,
				})
				await this.invalidateListCache()
			}
			return count
		} catch (error) {
			logError("VoteRepository deleteByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to delete votes by chat ID", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete all votes for a message.
	 * Used for cascade delete when a message is deleted.
	 *
	 * @param messageId - Message ID
	 * @returns Number of votes deleted
	 */
	async deleteByMessageId(messageId: string): Promise<number> {
		try {
			const results = await this.db
				.delete(vote)
				.where(eq(vote.messageId, messageId))
				.returning({ messageId: vote.messageId })

			const count = results.length
			if (count > 0) {
				logDebug("VoteRepository votes deleted by message ID", {
					messageId,
					count,
				})
				await this.invalidateListCache()
			}
			return count
		} catch (error) {
			logError("VoteRepository deleteByMessageId error", error as Error, {
				messageId,
			})
			throw new InternalServerError(
				"Failed to delete votes by message ID",
				{
					messageId,
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
 * Singleton instance of VoteRepository.
 * Use this for all vote data operations.
 */
export const voteRepository = new VoteRepository()
