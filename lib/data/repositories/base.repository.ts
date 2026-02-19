/**
 * Base Repository
 *
 * Abstract base class defining the repository pattern with generic CRUD operations
 * and integrated caching. Provides cache-through reads and write-through operations.
 *
 * @module lib/data/repositories/base.repository
 */

import "server-only"

import { TieredCache } from "@/lib/cache/tiered-cache"
import { CACHE_TTL } from "@/lib/constants"
import { db } from "@/lib/db/client"
import { InternalServerError } from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

// =============================================================================
// Types
// =============================================================================

/**
 * Interface for entities with an ID.
 * All entities managed by repositories must implement this interface.
 */
export interface Identifiable {
	id: string
}

/**
 * Options for findMany operations.
 */
export interface FindManyOptions {
	/** Maximum number of results to return */
	limit?: number
	/** Number of results to skip (for pagination) */
	offset?: number
	/** Filter conditions (implementation-specific) */
	where?: Record<string, unknown>
	/** Sort order (implementation-specific) */
	orderBy?: Record<string, "asc" | "desc">
}

/**
 * Options for count operations.
 */
export interface CountOptions {
	/** Filter conditions (implementation-specific) */
	where?: Record<string, unknown>
}

/**
 * Context for repository operations.
 * Provides user context for ownership checks and authorization.
 */
export interface RepositoryContext {
	/** User ID performing the operation */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
}

/**
 * Result of a repository operation.
 */
export interface RepositoryResult<T> {
	/** The entity data */
	data: T
	/** Whether the result came from cache */
	fromCache: boolean
}

// =============================================================================
// Repository Interfaces
// =============================================================================

/**
 * Interface for read operations.
 * Defines the contract for reading entities from the data store.
 *
 * @typeParam T - Entity type (must have an id property)
 */
export interface IReadRepository<T extends Identifiable> {
	/**
	 * Find an entity by its ID.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns The entity or null if not found
	 */
	findById(id: string, context?: RepositoryContext): Promise<T | null>

	/**
	 * Find multiple entities matching the given options.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching entities
	 */
	findMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<T[]>

	/**
	 * Check if an entity exists.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns true if the entity exists
	 */
	exists(id: string, context?: RepositoryContext): Promise<boolean>

	/**
	 * Count entities matching the given options.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching entities
	 */
	count(options?: CountOptions, context?: RepositoryContext): Promise<number>
}

/**
 * Interface for write operations.
 * Defines the contract for creating, updating, and deleting entities.
 *
 * @typeParam T - Entity type
 * @typeParam TCreate - Type for create operations
 * @typeParam TUpdate - Type for update operations
 */
export interface IWriteRepository<
	T extends Identifiable,
	TCreate,
	TUpdate = Partial<TCreate>,
> {
	/**
	 * Create a new entity.
	 *
	 * @param data - Entity creation data
	 * @param context - Optional repository context
	 * @returns The created entity
	 */
	create(data: TCreate, context?: RepositoryContext): Promise<T>

	/**
	 * Create multiple entities.
	 *
	 * @param data - Array of entity creation data
	 * @param context - Optional repository context
	 * @returns Array of created entities
	 */
	createMany(data: TCreate[], context?: RepositoryContext): Promise<T[]>

	/**
	 * Update an existing entity.
	 *
	 * @param id - Entity ID
	 * @param data - Entity update data
	 * @param context - Optional repository context
	 * @returns The updated entity
	 */
	update(id: string, data: TUpdate, context?: RepositoryContext): Promise<T>

	/**
	 * Delete an entity.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns true if deleted successfully
	 */
	delete(id: string, context?: RepositoryContext): Promise<boolean>

	/**
	 * Delete multiple entities.
	 *
	 * @param ids - Array of entity IDs
	 * @param context - Optional repository context
	 * @returns Number of entities deleted
	 */
	deleteMany(ids: string[], context?: RepositoryContext): Promise<number>
}

// =============================================================================
// Base Repository Implementation
// =============================================================================

/**
 * Abstract base class for repositories.
 * Implements cache-through reads and write-through operations.
 *
 * @typeParam T - Entity type (must have an id property)
 * @typeParam TCreate - Type for create operations
 * @typeParam TUpdate - Type for update operations
 *
 * @example
 * ```typescript
 * class ChatRepository extends BaseRepository<Chat, NewChat, UpdateChat> {
 *   protected cacheKey = (id: string) => `chat:${id}`
 *   protected cacheListKey = () => 'chats:list'
 *   protected ttl = CACHE_TTL.chat
 *   protected listTtl = CACHE_TTL.list
 *
 *   protected async doFindById(id: string) {
 *     return db.query.chat.findFirst({ where: eq(chat.id, id) })
 *   }
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseRepository<
	T extends Identifiable,
	TCreate,
	TUpdate = Partial<TCreate>,
> implements IReadRepository<T>, IWriteRepository<T, TCreate, TUpdate>
{
	/** Database client - using typeof db for correct type inference */
	protected readonly db: typeof db

	/** Cache instance for single entities */
	protected readonly cache: TieredCache<T>

	/** Cache instance for lists */
	protected readonly listCache: TieredCache<T[]>

	/**
	 * Create a new repository instance.
	 *
	 * @param cacheOptions - Optional cache configuration
	 */
	constructor(cacheOptions?: { l1Ttl?: number; l2Ttl?: number }) {
		this.db = db
		this.cache = new TieredCache<T>({
			l1Ttl: cacheOptions?.l1Ttl ?? 60,
			l2Ttl: cacheOptions?.l2Ttl ?? CACHE_TTL.default,
		})
		this.listCache = new TieredCache<T[]>({
			l1Ttl: cacheOptions?.l1Ttl ?? 60,
			l2Ttl: cacheOptions?.l2Ttl ?? CACHE_TTL.default,
		})
	}

	// =============================================================================
	// Abstract Methods - Must be implemented by subclasses
	// =============================================================================

	/**
	 * Generate a cache key for a single entity.
	 *
	 * @param id - Entity ID
	 * @returns Cache key string
	 */
	protected abstract cacheKey(id: string): string

	/**
	 * Generate a cache key for list operations.
	 *
	 * @returns Cache key string for lists
	 */
	protected abstract cacheListKey(): string

	/**
	 * TTL for cached entities (in seconds).
	 */
	protected abstract get ttl(): number

	/**
	 * TTL for cached lists (in seconds).
	 * Should be shorter than entity TTL as lists become stale faster.
	 */
	protected abstract get listTtl(): number

	/**
	 * Find an entity by ID from the database.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns The entity or null if not found
	 */
	protected abstract doFindById(
		id: string,
		context?: RepositoryContext,
	): Promise<T | null>

	/**
	 * Create an entity in the database.
	 *
	 * @param data - Entity creation data
	 * @param context - Optional repository context
	 * @returns The created entity
	 */
	protected abstract doCreate(
		data: TCreate,
		context?: RepositoryContext,
	): Promise<T>

	/**
	 * Update an entity in the database.
	 *
	 * @param id - Entity ID
	 * @param data - Entity update data
	 * @param context - Optional repository context
	 * @returns The updated entity
	 */
	protected abstract doUpdate(
		id: string,
		data: TUpdate,
		context?: RepositoryContext,
	): Promise<T>

	/**
	 * Delete an entity from the database.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns true if deleted successfully
	 */
	protected abstract doDelete(
		id: string,
		context?: RepositoryContext,
	): Promise<boolean>

	/**
	 * Find multiple entities from the database.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching entities
	 */
	protected abstract doFindMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<T[]>

	/**
	 * Count entities in the database.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching entities
	 */
	protected abstract doCount(
		options?: CountOptions,
		context?: RepositoryContext,
	): Promise<number>

	// =============================================================================
	// Read Operations (Cache-Through)
	// =============================================================================

	/**
	 * Find an entity by its ID.
	 * Implements cache-through pattern: check cache first, then DB on miss.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns The entity or null if not found
	 */
	async findById(id: string, context?: RepositoryContext): Promise<T | null> {
		const key = this.cacheKey(id)

		try {
			// Check cache first
			const cached = await this.cache.get(key)
			if (cached.found && cached.value) {
				logDebug("Repository cache hit", { key, id })
				return cached.value
			}

			if (context?.isGuest) {
				logDebug("Repository guest cache miss - skipping DB fallback", {
					key,
					id,
				})
				return null
			}

			// Cache miss - fetch from database
			logDebug("Repository cache miss", { key, id })
			const result = await this.doFindById(id, context)

			// Populate cache on miss
			if (result) {
				await this.cache.set(key, result, { ttl: this.ttl })
				logDebug("Repository cache populated", { key, id })
			}

			return result
		} catch (error) {
			logError("Repository findById error", error as Error, { id })
			throw new InternalServerError(
				`Failed to find entity by ID: ${id}`,
				{
					id,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find multiple entities matching the given options.
	 * Note: List queries are cached separately with shorter TTL.
	 *
	 * @param options - Query options
	 * @param context - Optional repository context
	 * @returns Array of matching entities
	 */
	async findMany(
		options?: FindManyOptions,
		context?: RepositoryContext,
	): Promise<T[]> {
		const listKey = this.cacheListKey()

		try {
			// For simple queries without filters, check cache
			if (!options?.where && !options?.offset) {
				const cached = await this.listCache.get(listKey)
				if (cached.found && cached.value) {
					logDebug("Repository list cache hit", { listKey })
					// Apply limit if specified
					if (options?.limit && cached.value.length > options.limit) {
						return cached.value.slice(0, options.limit)
					}
					return cached.value
				}

				if (context?.isGuest) {
					logDebug(
						"Repository guest list cache miss - skipping DB fallback",
						{ listKey },
					)
					return []
				}
			} else if (context?.isGuest) {
				logDebug(
					"Repository guest filtered query - skipping DB fallback",
					{ listKey, options },
				)
				return []
			}

			// Fetch from database
			logDebug("Repository list cache miss", { listKey, options })
			const results = await this.doFindMany(options, context)

			// Cache simple queries
			if (!options?.where && !options?.offset) {
				await this.listCache.set(listKey, results, {
					ttl: this.listTtl,
				})
				logDebug("Repository list cache populated", { listKey })
			}

			return results
		} catch (error) {
			logError("Repository findMany error", error as Error, { options })
			throw new InternalServerError("Failed to find entities", {
				options,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Check if an entity exists.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns true if the entity exists
	 */
	async exists(id: string, context?: RepositoryContext): Promise<boolean> {
		const entity = await this.findById(id, context)
		return entity !== null
	}

	/**
	 * Count entities matching the given options.
	 *
	 * @param options - Count options
	 * @param context - Optional repository context
	 * @returns Number of matching entities
	 */
	async count(
		options?: CountOptions,
		context?: RepositoryContext,
	): Promise<number> {
		try {
			return await this.doCount(options, context)
		} catch (error) {
			logError("Repository count error", error as Error, { options })
			throw new InternalServerError("Failed to count entities", {
				options,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Write Operations (Write-Through)
	// =============================================================================

	/**
	 * Create a new entity.
	 * Implements write-through: write to DB, then update cache.
	 *
	 * @param data - Entity creation data
	 * @param context - Optional repository context
	 * @returns The created entity
	 */
	async create(data: TCreate, context?: RepositoryContext): Promise<T> {
		try {
			const result = await this.doCreate(data, context)

			// Update cache
			const key = this.cacheKey(result.id)
			await this.cache.set(key, result, { ttl: this.ttl })

			// Invalidate list cache
			await this.invalidateListCache()

			logDebug("Repository entity created", { id: result.id, key })
			return result
		} catch (error) {
			logError("Repository create error", error as Error, { data })
			throw new InternalServerError("Failed to create entity", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create multiple entities.
	 *
	 * @param data - Array of entity creation data
	 * @param context - Optional repository context
	 * @returns Array of created entities
	 */
	async createMany(
		data: TCreate[],
		context?: RepositoryContext,
	): Promise<T[]> {
		try {
			const results: T[] = []

			for (const item of data) {
				const result = await this.doCreate(item, context)
				results.push(result)

				// Update cache for each entity
				const key = this.cacheKey(result.id)
				await this.cache.set(key, result, { ttl: this.ttl })
			}

			// Invalidate list cache once after all creates
			await this.invalidateListCache()

			logDebug("Repository entities created", { count: results.length })
			return results
		} catch (error) {
			logError("Repository createMany error", error as Error, {
				count: data.length,
			})
			throw new InternalServerError("Failed to create entities", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update an existing entity.
	 * Implements write-through: write to DB, then update cache.
	 *
	 * @param id - Entity ID
	 * @param data - Entity update data
	 * @param context - Optional repository context
	 * @returns The updated entity
	 */
	async update(
		id: string,
		data: TUpdate,
		context?: RepositoryContext,
	): Promise<T> {
		try {
			const result = await this.doUpdate(id, data, context)

			// Update cache
			const key = this.cacheKey(id)
			await this.cache.set(key, result, { ttl: this.ttl })

			// Invalidate list cache
			await this.invalidateListCache()

			logDebug("Repository entity updated", { id, key })
			return result
		} catch (error) {
			logError("Repository update error", error as Error, { id, data })
			throw new InternalServerError(`Failed to update entity: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete an entity.
	 * Implements write-through: delete from DB, then invalidate cache.
	 *
	 * @param id - Entity ID
	 * @param context - Optional repository context
	 * @returns true if deleted successfully
	 */
	async delete(id: string, context?: RepositoryContext): Promise<boolean> {
		try {
			const success = await this.doDelete(id, context)

			if (success) {
				// Invalidate cache
				const key = this.cacheKey(id)
				await this.cache.delete(key)

				// Invalidate list cache
				await this.invalidateListCache()

				logDebug("Repository entity deleted", { id, key })
			}

			return success
		} catch (error) {
			logError("Repository delete error", error as Error, { id })
			throw new InternalServerError(`Failed to delete entity: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete multiple entities.
	 *
	 * @param ids - Array of entity IDs
	 * @param context - Optional repository context
	 * @returns Number of entities deleted
	 */
	async deleteMany(
		ids: string[],
		context?: RepositoryContext,
	): Promise<number> {
		try {
			let deletedCount = 0

			for (const id of ids) {
				const success = await this.doDelete(id, context)
				if (success) {
					deletedCount++
					// Invalidate cache for each deleted entity
					const key = this.cacheKey(id)
					await this.cache.delete(key)
				}
			}

			// Invalidate list cache once after all deletes
			await this.invalidateListCache()

			logDebug("Repository entities deleted", { count: deletedCount })
			return deletedCount
		} catch (error) {
			logError("Repository deleteMany error", error as Error, {
				count: ids.length,
			})
			throw new InternalServerError("Failed to delete entities", {
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Cache Utilities
	// =============================================================================

	/**
	 * Invalidate the list cache.
	 * Called after create, update, and delete operations.
	 */
	protected async invalidateListCache(): Promise<void> {
		const listKey = this.cacheListKey()
		await this.listCache.delete(listKey)
		logDebug("Repository list cache invalidated", { listKey })
	}

	/**
	 * Invalidate cache for a specific entity.
	 *
	 * @param id - Entity ID
	 */
	async invalidateCache(id: string): Promise<void> {
		const key = this.cacheKey(id)
		await this.cache.delete(key)
		logDebug("Repository entity cache invalidated", { id, key })
	}

	/**
	 * Invalidate all caches for this repository.
	 */
	async invalidateAllCaches(): Promise<void> {
		await this.invalidateListCache()
		this.cache.clear()
		logDebug("Repository all caches invalidated")
	}

	/**
	 * Get cache statistics.
	 */
	getCacheStats() {
		return this.cache.stats
	}
}
