/**
 * Suggestion Repository
 *
 * Suggestion entity repository for AI-generated edit suggestions on artifacts.
 * Extends BaseRepository with cache-through strategy and artifact association.
 *
 * Key features:
 * - Artifact association via composite foreign key (artifactId, artifactCreatedAt)
 * - Document-scoped queries (document = artifact in v6 terminology)
 * - Cascade delete support for artifact deletion
 *
 * @module lib/data/repositories/suggestion.repository
 */

import "server-only"

import { and, eq, gt, type SQL } from "drizzle-orm"

import { CACHE_TTL } from "@/lib/constants"
import type { NewSuggestion, Suggestion } from "@/lib/db/schema"
import { suggestion } from "@/lib/db/schema"
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
 * Options for suggestion-specific find operations
 */
export interface SuggestionFindOptions extends FindManyOptions {
	/** Filter by artifact ID */
	artifactId?: string
	/** Filter by user ID */
	userId?: string
	/** Filter by resolved status */
	isResolved?: boolean
}

// =============================================================================
// Suggestion Repository Implementation
// =============================================================================

/**
 * Suggestion repository for AI-generated edit suggestions on artifacts.
 *
 * Suggestions are associated with artifacts via a composite foreign key
 * (artifactId, artifactCreatedAt) pointing to the artifact's version.
 *
 * @example
 * ```typescript
 * const suggestionRepo = new SuggestionRepository();
 *
 * // Get suggestions for an artifact
 * const suggestions = await suggestionRepo.findByArtifactId('artifact-123', ctx);
 *
 * // Get suggestions by document ID (alias for artifact)
 * const suggestions = await suggestionRepo.findByDocumentId('doc-123', ctx);
 *
 * // Delete all suggestions for an artifact (cascade)
 * await suggestionRepo.deleteByArtifactId('artifact-123');
 * ```
 */
export class SuggestionRepository extends BaseRepository<
	Suggestion,
	NewSuggestion,
	Partial<NewSuggestion>
> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single suggestion
	 * @param id - Suggestion ID
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `suggestion:${id}`
	}

	/**
	 * Generate cache key for suggestion lists
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "suggestions:list"
	}

	/**
	 * Generate cache key for suggestions by artifact
	 * @param artifactId - Artifact ID
	 * @returns Cache key string for artifact suggestions
	 */
	protected cacheArtifactKey(artifactId: string): string {
		return `suggestions:artifact:${artifactId}`
	}

	/**
	 * TTL for cached suggestion entities (30 minutes)
	 */
	protected get ttl(): number {
		return CACHE_TTL.default ?? 1800
	}

	/**
	 * TTL for cached suggestion lists (5 minutes)
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list ?? 300
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find a suggestion by ID from the database.
	 *
	 * @param id - Suggestion ID
	 * @param context - Optional repository context for ownership check
	 * @returns The suggestion or null if not found
	 */
	protected async doFindById(
		id: string,
		context?: RepositoryContext,
	): Promise<Suggestion | null> {
		try {
			const conditions: SQL<unknown>[] = [eq(suggestion.id, id)]

			// Add user ownership check if context provided
			if (context?.userId) {
				conditions.push(eq(suggestion.userId, context.userId))
			}

			const [result] = await this.db
				.select()
				.from(suggestion)
				.where(and(...conditions))

			return result ?? null
		} catch (error) {
			logError("SuggestionRepository doFindById error", error as Error, {
				id,
			})
			throw new InternalServerError(
				`Failed to find suggestion by ID: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find multiple suggestions from the database.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching suggestions
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<Suggestion[]> {
		try {
			const conditions: SQL<unknown>[] = []

			// Add user filter if provided
			if (options?.where?.userId) {
				conditions.push(
					eq(suggestion.userId, options.where.userId as string),
				)
			} else if (context?.userId) {
				conditions.push(eq(suggestion.userId, context.userId))
			}

			// Add artifact filter if provided
			if (options?.where?.artifactId) {
				conditions.push(
					eq(
						suggestion.artifactId,
						options.where.artifactId as string,
					),
				)
			}

			// Add resolved filter if provided
			if (options?.where?.isResolved !== undefined) {
				conditions.push(
					eq(
						suggestion.isResolved,
						options.where.isResolved as boolean,
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			let query = this.db
				.select()
				.from(suggestion)
				.where(whereClause)
				.orderBy(suggestion.createdAt)

			// Apply pagination
			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			return await query
		} catch (error) {
			logError("SuggestionRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find suggestions", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count suggestions in the database.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching suggestions
	 */
	protected async doCount(
		options?: CountOptions,
		context?: RepositoryContext,
	): Promise<number> {
		try {
			const conditions: SQL<unknown>[] = []

			if (options?.where?.userId) {
				conditions.push(
					eq(suggestion.userId, options.where.userId as string),
				)
			} else if (context?.userId) {
				conditions.push(eq(suggestion.userId, context.userId))
			}

			if (options?.where?.artifactId) {
				conditions.push(
					eq(
						suggestion.artifactId,
						options.where.artifactId as string,
					),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			const result = await this.db
				.select({ count: suggestion.id })
				.from(suggestion)
				.where(whereClause)

			return result.length
		} catch (error) {
			logError("SuggestionRepository doCount error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to count suggestions", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new suggestion in the database.
	 *
	 * @param data - Suggestion creation data
	 * @param context - Optional repository context
	 * @returns The created suggestion
	 */
	protected async doCreate(
		data: NewSuggestion,
		context?: RepositoryContext,
	): Promise<Suggestion> {
		try {
			// Use context userId if not provided in data
			const suggestionData = {
				...data,
				userId: data.userId ?? context?.userId,
			}

			const [result] = await this.db
				.insert(suggestion)
				.values(suggestionData)
				.returning()

			if (!result) {
				throw new Error(
					"Failed to create suggestion - no result returned",
				)
			}

			logDebug("SuggestionRepository suggestion created", {
				id: result.id,
			})
			return result
		} catch (error) {
			logError("SuggestionRepository doCreate error", error as Error, {
				data,
			})
			throw new InternalServerError("Failed to create suggestion", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a suggestion in the database.
	 *
	 * @param id - Suggestion ID
	 * @param data - Suggestion update data
	 * @param context - Optional repository context for ownership check
	 * @returns The updated suggestion
	 */
	protected async doUpdate(
		id: string,
		data: Partial<NewSuggestion>,
		context?: RepositoryContext,
	): Promise<Suggestion> {
		try {
			const conditions: SQL<unknown>[] = [eq(suggestion.id, id)]

			if (context?.userId) {
				conditions.push(eq(suggestion.userId, context.userId))
			}

			const [result] = await this.db
				.update(suggestion)
				.set(data)
				.where(and(...conditions))
				.returning()

			if (!result) {
				throw new InternalServerError(`Suggestion not found: ${id}`)
			}

			logDebug("SuggestionRepository suggestion updated", { id })
			return result
		} catch (error) {
			logError("SuggestionRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(
				`Failed to update suggestion: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Delete a suggestion from the database.
	 *
	 * @param id - Suggestion ID
	 * @param context - Optional repository context for ownership check
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const conditions: SQL<unknown>[] = [eq(suggestion.id, id)]

			if (context?.userId) {
				conditions.push(eq(suggestion.userId, context.userId))
			}

			const [result] = await this.db
				.delete(suggestion)
				.where(and(...conditions))
				.returning({ id: suggestion.id })

			const success = !!result
			if (success) {
				logDebug("SuggestionRepository suggestion deleted", { id })
			}
			return success
		} catch (error) {
			logError("SuggestionRepository doDelete error", error as Error, {
				id,
			})
			throw new InternalServerError(
				`Failed to delete suggestion: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	// =============================================================================
	// Suggestion-Specific Methods
	// =============================================================================

	/**
	 * Find all suggestions for a specific artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param context - Repository context for ownership check
	 * @returns Array of suggestions for the artifact
	 */
	async findByArtifactId(
		artifactId: string,
		context: RepositoryContext,
	): Promise<Suggestion[]> {
		try {
			const results = await this.db
				.select()
				.from(suggestion)
				.where(
					and(
						eq(suggestion.artifactId, artifactId),
						eq(suggestion.userId, context.userId),
					),
				)
				.orderBy(suggestion.createdAt)

			return results
		} catch (error) {
			logError(
				"SuggestionRepository findByArtifactId error",
				error as Error,
				{ artifactId },
			)
			throw new InternalServerError(
				"Failed to find suggestions by artifact ID",
				{
					artifactId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find all suggestions for a specific document.
	 * This is an alias for findByArtifactId (document = artifact in v6).
	 *
	 * @param documentId - Document ID (alias for artifact ID)
	 * @param context - Repository context for ownership check
	 * @returns Array of suggestions for the document
	 */
	async findByDocumentId(
		documentId: string,
		context: RepositoryContext,
	): Promise<Suggestion[]> {
		return this.findByArtifactId(documentId, context)
	}

	/**
	 * Delete all suggestions for a specific artifact.
	 * Used for cascade delete when an artifact is deleted.
	 *
	 * @param artifactId - Artifact ID
	 * @returns Number of suggestions deleted
	 */
	async deleteByArtifactId(artifactId: string): Promise<number> {
		try {
			const results = await this.db
				.delete(suggestion)
				.where(eq(suggestion.artifactId, artifactId))
				.returning({ id: suggestion.id })

			const count = results.length
			if (count > 0) {
				logDebug(
					"SuggestionRepository deleted suggestions for artifact",
					{
						artifactId,
						count,
					},
				)
			}
			return count
		} catch (error) {
			logError(
				"SuggestionRepository deleteByArtifactId error",
				error as Error,
				{ artifactId },
			)
			throw new InternalServerError(
				"Failed to delete suggestions by artifact ID",
				{
					artifactId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Delete suggestions created after a specific timestamp.
	 * Used for rollback when artifact versions are deleted.
	 *
	 * @param artifactId - Artifact ID
	 * @param timestamp - Delete suggestions created after this time
	 * @returns Number of suggestions deleted
	 */
	async deleteAfterTimestamp(
		artifactId: string,
		timestamp: Date,
	): Promise<number> {
		try {
			const results = await this.db
				.delete(suggestion)
				.where(
					and(
						eq(suggestion.artifactId, artifactId),
						gt(suggestion.createdAt, timestamp),
					),
				)
				.returning({ id: suggestion.id })

			const count = results.length
			if (count > 0) {
				logDebug(
					"SuggestionRepository deleted suggestions after timestamp",
					{ artifactId, timestamp, count },
				)
			}
			return count
		} catch (error) {
			logError(
				"SuggestionRepository deleteAfterTimestamp error",
				error as Error,
				{ artifactId, timestamp },
			)
			throw new InternalServerError(
				"Failed to delete suggestions after timestamp",
				{
					artifactId,
					timestamp,
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
 * Singleton instance of SuggestionRepository
 */
export const suggestionRepository = new SuggestionRepository()
