/**
 * Artifact Repository
 *
 * Artifact entity repository with versioning support, chat association,
 * and suggestion queries. Extends BaseRepository with cache-through strategy.
 *
 * Key features:
 * - Versioning support via composite primary key (id, createdAt)
 * - Rollback functionality via deleteVersionsAfterTimestamp
 * - Chat-scoped artifact queries
 *
 * @module lib/data/repositories/artifact.repository
 */

import "server-only"

import { and, asc, desc, eq, gt, type SQL } from "drizzle-orm"

import { CACHE_TTL } from "@/lib/constants"
import type { Artifact, NewArtifact, Suggestion } from "@/lib/db/schema"
import { artifact, suggestion } from "@/lib/db/schema"
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
 * Options for artifact-specific find operations
 */
export interface ArtifactFindOptions extends FindManyOptions {
	/** Filter by chat ID */
	chatId?: string
	/** Filter by user ID */
	userId?: string
	/** Filter by artifact kind */
	kind?: "text" | "code" | "image" | "sheet"
}

/**
 * Parameters for saving a new artifact version
 */
export interface SaveVersionParams {
	/** Artifact ID (shared across versions) */
	id: string
	/** Chat ID this artifact belongs to */
	chatId: string
	/** Artifact title */
	title: string
	/** Artifact kind/type */
	kind: "text" | "code" | "image" | "sheet"
	/** Artifact content */
	content: string
}

/**
 * Artifact version summary (for version history display)
 */
export interface ArtifactVersion {
	/** Version title */
	title: string
	/** Version content */
	content: string | null
	/** Artifact kind */
	kind: "text" | "code" | "image" | "sheet"
	/** Version creation timestamp */
	createdAt: Date
	/** Version last update timestamp */
	updatedAt: Date
}

// =============================================================================
// Artifact Repository Implementation
// =============================================================================

/**
 * Artifact repository with versioning support and chat association.
 *
 * Artifacts use a composite primary key (id, createdAt) to support versioning.
 * Each version of an artifact shares the same `id` but has a unique `createdAt`.
 *
 * @example
 * ```typescript
 * const artifactRepo = new ArtifactRepository();
 *
 * // Get all versions of an artifact
 * const versions = await artifactRepo.findAllVersions(artifactId, ctx);
 *
 * // Get the latest version
 * const latest = await artifactRepo.findLatestVersion(artifactId, ctx);
 *
 * // Save a new version
 * const newVersion = await artifactRepo.saveVersion({
 *   id: artifactId,
 *   chatId: 'chat-123',
 *   title: 'My Document',
 *   kind: 'text',
 *   content: 'Updated content...'
 * }, ctx);
 *
 * // Rollback to a specific timestamp
 * await artifactRepo.deleteVersionsAfterTimestamp(artifactId, timestamp, ctx);
 * ```
 */
export class ArtifactRepository extends BaseRepository<
	Artifact,
	NewArtifact,
	Partial<NewArtifact>
> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single artifact
	 * @param id - Artifact ID
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `artifact:${id}`
	}

	/**
	 * Generate cache key for artifact lists
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "artifacts:list"
	}

	/**
	 * TTL for cached artifact entities (1 hour)
	 */
	protected get ttl(): number {
		return CACHE_TTL.artifact ?? 3600
	}

	/**
	 * TTL for cached artifact lists (10 minutes)
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list ?? 300
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find an artifact by ID from the database.
	 * Returns the latest version of the artifact.
	 *
	 * Note: Due to composite primary key, this returns the most recent version.
	 *
	 * @param id - Artifact ID
	 * @param context - Optional repository context for ownership check
	 * @returns The artifact (latest version) or null if not found
	 */
	protected async doFindById(
		id: string,
		context?: RepositoryContext,
	): Promise<Artifact | null> {
		try {
			const conditions: SQL<unknown>[] = [eq(artifact.id, id)]

			// Add user ownership check if context provided
			if (context?.userId) {
				conditions.push(eq(artifact.userId, context.userId))
			}

			// Get the latest version (highest createdAt)
			const results = await this.db
				.select()
				.from(artifact)
				.where(and(...conditions))
				.orderBy(desc(artifact.createdAt))
				.limit(1)

			return results[0] ?? null
		} catch (error) {
			logError("ArtifactRepository doFindById error", error as Error, {
				id,
			})
			throw new InternalServerError(
				`Failed to find artifact by ID: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find multiple artifacts from the database.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching artifacts (latest versions only)
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			const conditions: SQL<unknown>[] = []

			// Add user filter if provided
			if (options?.where?.userId) {
				conditions.push(
					eq(artifact.userId, options.where.userId as string),
				)
			} else if (context?.userId) {
				conditions.push(eq(artifact.userId, context.userId))
			}

			// Add chat filter if provided
			if (options?.where?.chatId) {
				conditions.push(
					eq(artifact.chatId, options.where.chatId as string),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			// Build query with ordering
			let query = this.db
				.select()
				.from(artifact)
				.where(whereClause)
				.orderBy(desc(artifact.createdAt))

			// Apply pagination
			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			return await query
		} catch (error) {
			logError("ArtifactRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find artifacts", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count artifacts in the database.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching artifacts
	 */
	protected async doCount(
		options?: CountOptions,
		context?: RepositoryContext,
	): Promise<number> {
		try {
			const conditions: SQL<unknown>[] = []

			if (options?.where?.userId) {
				conditions.push(
					eq(artifact.userId, options.where.userId as string),
				)
			} else if (context?.userId) {
				conditions.push(eq(artifact.userId, context.userId))
			}

			if (options?.where?.chatId) {
				conditions.push(
					eq(artifact.chatId, options.where.chatId as string),
				)
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined

			const result = await this.db
				.select({ count: artifact.id })
				.from(artifact)
				.where(whereClause)

			return result.length
		} catch (error) {
			logError("ArtifactRepository doCount error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to count artifacts", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new artifact in the database.
	 *
	 * @param data - Artifact creation data
	 * @param context - Optional repository context
	 * @returns The created artifact
	 */
	protected async doCreate(
		data: NewArtifact,
		context?: RepositoryContext,
	): Promise<Artifact> {
		try {
			// Use context userId if not provided in data
			const artifactData = {
				...data,
				userId: data.userId ?? context?.userId,
			}

			const [result] = await this.db
				.insert(artifact)
				.values(artifactData)
				.returning()

			if (!result) {
				throw new Error(
					"Failed to create artifact - no result returned",
				)
			}

			logDebug("ArtifactRepository artifact created", { id: result.id })
			return result
		} catch (error) {
			logError("ArtifactRepository doCreate error", error as Error, {
				data,
			})
			throw new InternalServerError("Failed to create artifact", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update an artifact in the database.
	 * Note: Due to composite PK, this creates a new version.
	 *
	 * @param id - Artifact ID
	 * @param data - Artifact update data
	 * @param context - Optional repository context for ownership check
	 * @returns The updated artifact (new version)
	 */
	protected async doUpdate(
		id: string,
		data: Partial<NewArtifact>,
		context?: RepositoryContext,
	): Promise<Artifact> {
		try {
			// Get the latest version first
			const latest = await this.doFindById(id, context)
			if (!latest) {
				throw new NotFoundError(`Artifact not found: ${id}`)
			}

			// Create a new version with updated data
			const newVersion: NewArtifact = {
				id,
				title: data.title ?? latest.title,
				content: data.content ?? latest.content,
				kind: data.kind ?? latest.kind,
				userId: latest.userId,
				chatId: latest.chatId,
			}

			const [result] = await this.db
				.insert(artifact)
				.values(newVersion)
				.returning()

			if (!result) {
				throw new Error(
					"Failed to update artifact - no result returned",
				)
			}

			logDebug("ArtifactRepository artifact updated (new version)", {
				id: result.id,
			})
			return result
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ArtifactRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(`Failed to update artifact: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete an artifact from the database.
	 * Note: This deletes ALL versions of the artifact.
	 *
	 * @param id - Artifact ID
	 * @param context - Optional repository context for ownership check
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const conditions: SQL<unknown>[] = [eq(artifact.id, id)]

			if (context?.userId) {
				conditions.push(eq(artifact.userId, context.userId))
			}

			const result = await this.db
				.delete(artifact)
				.where(and(...conditions))
				.returning({ id: artifact.id })

			const success = result.length > 0
			if (success) {
				logDebug("ArtifactRepository artifact deleted (all versions)", {
					id,
				})
			}
			return success
		} catch (error) {
			logError("ArtifactRepository doDelete error", error as Error, {
				id,
			})
			throw new InternalServerError(`Failed to delete artifact: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Artifact-Specific Methods
	// =============================================================================

	/**
	 * Find all versions of an artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param context - Repository context for ownership check
	 * @returns Array of artifact versions (chronologically ordered)
	 */
	async findAllVersions(
		artifactId: string,
		context: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			const results = await this.db
				.select()
				.from(artifact)
				.where(
					and(
						eq(artifact.id, artifactId),
						eq(artifact.userId, context.userId),
					),
				)
				.orderBy(asc(artifact.createdAt))

			return results
		} catch (error) {
			logError(
				"ArtifactRepository findAllVersions error",
				error as Error,
				{ artifactId },
			)
			throw new InternalServerError(
				"Failed to find all artifact versions",
				{
					artifactId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find the latest version of an artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param context - Repository context for ownership check
	 * @returns The latest artifact version or null if not found
	 */
	async findLatestVersion(
		artifactId: string,
		context: RepositoryContext,
	): Promise<Artifact | null> {
		try {
			const results = await this.db
				.select()
				.from(artifact)
				.where(
					and(
						eq(artifact.id, artifactId),
						eq(artifact.userId, context.userId),
					),
				)
				.orderBy(desc(artifact.createdAt))
				.limit(1)

			return results[0] ?? null
		} catch (error) {
			logError(
				"ArtifactRepository findLatestVersion error",
				error as Error,
				{ artifactId },
			)
			throw new InternalServerError(
				"Failed to find latest artifact version",
				{
					artifactId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find all artifacts for a specific chat.
	 * Returns the latest version of each artifact in the chat.
	 *
	 * @param chatId - Chat ID
	 * @param context - Repository context for ownership check
	 * @returns Array of artifacts (latest versions)
	 */
	async findByChatId(
		chatId: string,
		context: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			// Get all artifacts for the chat
			const results = await this.db
				.select()
				.from(artifact)
				.where(
					and(
						eq(artifact.chatId, chatId),
						eq(artifact.userId, context.userId),
					),
				)
				.orderBy(desc(artifact.createdAt))

			// Group by id and keep only the latest version of each
			const latestVersions = new Map<string, Artifact>()
			for (const art of results) {
				if (!latestVersions.has(art.id)) {
					latestVersions.set(art.id, art)
				}
			}

			return Array.from(latestVersions.values())
		} catch (error) {
			logError("ArtifactRepository findByChatId error", error as Error, {
				chatId,
			})
			throw new InternalServerError(
				"Failed to find artifacts by chat ID",
				{
					chatId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Save a new version of an artifact.
	 * Creates a new version with the same ID but new createdAt timestamp.
	 *
	 * @param params - Version parameters
	 * @param context - Repository context
	 * @returns The created artifact version
	 */
	async saveVersion(
		params: SaveVersionParams,
		context: RepositoryContext,
	): Promise<Artifact> {
		try {
			const newVersion: NewArtifact = {
				id: params.id,
				title: params.title,
				content: params.content,
				kind: params.kind,
				userId: context.userId,
				chatId: params.chatId,
			}

			const [result] = await this.db
				.insert(artifact)
				.values(newVersion)
				.returning()

			if (!result) {
				throw new Error(
					"Failed to save artifact version - no result returned",
				)
			}

			logDebug("ArtifactRepository artifact version saved", {
				id: result.id,
				createdAt: result.createdAt,
			})

			// Invalidate cache
			await this.invalidateCache(params.id)
			await this.invalidateListCache()

			return result
		} catch (error) {
			logError("ArtifactRepository saveVersion error", error as Error, {
				params,
			})
			throw new InternalServerError("Failed to save artifact version", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete all artifact versions created after a specific timestamp.
	 * Used for rollback functionality.
	 *
	 * @param artifactId - Artifact ID
	 * @param timestamp - Delete versions created after this timestamp
	 * @param context - Repository context for ownership check
	 * @returns Array of deleted artifact versions
	 */
	async deleteVersionsAfterTimestamp(
		artifactId: string,
		timestamp: Date,
		context: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			// First delete associated suggestions
			await this.db
				.delete(suggestion)
				.where(
					and(
						eq(suggestion.artifactId, artifactId),
						gt(suggestion.artifactCreatedAt, timestamp),
					),
				)

			// Then delete artifact versions
			const deleted = await this.db
				.delete(artifact)
				.where(
					and(
						eq(artifact.id, artifactId),
						eq(artifact.userId, context.userId),
						gt(artifact.createdAt, timestamp),
					),
				)
				.returning()

			logDebug("ArtifactRepository versions deleted after timestamp", {
				artifactId,
				timestamp,
				count: deleted.length,
			})

			// Invalidate cache
			await this.invalidateCache(artifactId)
			await this.invalidateListCache()

			return deleted
		} catch (error) {
			logError(
				"ArtifactRepository deleteVersionsAfterTimestamp error",
				error as Error,
				{ artifactId, timestamp },
			)
			throw new InternalServerError(
				"Failed to delete artifact versions after timestamp",
				{
					artifactId,
					timestamp,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find suggestions for a specific artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param context - Repository context for ownership check
	 * @returns Array of suggestions for the artifact
	 */
	async findSuggestions(
		artifactId: string,
		context: RepositoryContext,
	): Promise<Suggestion[]> {
		try {
			// First verify the user owns the artifact
			const artifactExists = await this.db
				.select({ id: artifact.id })
				.from(artifact)
				.where(
					and(
						eq(artifact.id, artifactId),
						eq(artifact.userId, context.userId),
					),
				)
				.limit(1)

			if (artifactExists.length === 0) {
				return []
			}

			// Get suggestions for the artifact
			const suggestions = await this.db
				.select()
				.from(suggestion)
				.where(eq(suggestion.artifactId, artifactId))

			return suggestions
		} catch (error) {
			logError(
				"ArtifactRepository findSuggestions error",
				error as Error,
				{
					artifactId,
				},
			)
			throw new InternalServerError(
				"Failed to find artifact suggestions",
				{
					artifactId,
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
 * Singleton instance of ArtifactRepository
 */
export const artifactRepository = new ArtifactRepository()
