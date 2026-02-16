/**
 * User Repository
 *
 * User entity repository with authentication-related queries and profile management.
 * Extends BaseRepository with cache-through strategy.
 *
 * Security Note: Password hashes are excluded from cached User types.
 * Use findByEmailWithPassword for authentication flows only.
 *
 * @module lib/data/repositories/user.repository
 */

import "server-only"

import { eq } from "drizzle-orm"

import { CACHE_TTL } from "@/lib/constants"
import type { NewUser, User } from "@/lib/db/schema"
import { user } from "@/lib/db/schema"
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
 * User with password hash included.
 * Use ONLY for authentication flows - never expose in API responses.
 */
export type UserWithPassword = User & { passwordHash: string | null }

/**
 * Update data for user entity.
 * Partial type for user updates.
 */
export type UpdateUser = Partial<NewUser>

// =============================================================================
// User Repository Implementation
// =============================================================================

/**
 * User repository with authentication-specific queries.
 *
 * @example
 * ```typescript
 * const userRepo = new UserRepository();
 *
 * // Find user by email for auth
 * const user = await userRepo.findByEmail('user@example.com');
 *
 * // Check if email exists during registration
 * const exists = await userRepo.existsByEmail('user@example.com');
 *
 * // Update last login timestamp
 * await userRepo.updateLastLogin(userId);
 * ```
 */
export class UserRepository extends BaseRepository<User, NewUser, UpdateUser> {
	// =============================================================================
	// Cache Configuration
	// =============================================================================

	/**
	 * Generate cache key for a single user
	 * @param id - User ID
	 * @returns Cache key string
	 */
	protected cacheKey(id: string): string {
		return `user:${id}`
	}

	/**
	 * Generate cache key for user lists
	 * Note: User lists are not typically cached, so this returns a generic key.
	 * @returns Cache key string for lists
	 */
	protected cacheListKey(): string {
		return "users:list"
	}

	/**
	 * TTL for cached user entities (2 hours)
	 */
	protected get ttl(): number {
		return CACHE_TTL.user
	}

	/**
	 * TTL for cached user lists (5 minutes)
	 * Note: User lists are rarely used, short TTL.
	 */
	protected get listTtl(): number {
		return CACHE_TTL.list
	}

	// =============================================================================
	// Abstract Method Implementations
	// =============================================================================

	/**
	 * Find a user by ID from the database.
	 *
	 * @param id - User ID
	 * @param _context - Optional repository context (unused for user queries)
	 * @returns The user or null if not found
	 */
	protected async doFindById(
		id: string,
		_context?: RepositoryContext,
	): Promise<User | null> {
		try {
			const [result] = await this.db
				.select()
				.from(user)
				.where(eq(user.id, id))

			return result ?? null
		} catch (error) {
			logError("UserRepository doFindById error", error as Error, { id })
			throw new InternalServerError(`Failed to find user by ID: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Find multiple users from the database.
	 * Note: This is rarely used for users, but implemented for completeness.
	 *
	 * @param options - Query options
	 * @param _context - Optional repository context
	 * @returns Array of matching users
	 */
	protected async doFindMany(
		options?: FindManyOptions,
		_context?: RepositoryContext,
	): Promise<User[]> {
		try {
			let query = this.db.select().from(user)

			// Apply pagination
			if (options?.limit) {
				query = query.limit(options.limit) as typeof query
			}
			if (options?.offset) {
				query = query.offset(options.offset) as typeof query
			}

			return await query
		} catch (error) {
			logError("UserRepository doFindMany error", error as Error, {
				options,
			})
			throw new InternalServerError("Failed to find users", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Count users in the database.
	 *
	 * @param _options - Count options (unused for users)
	 * @param _context - Optional repository context
	 * @returns Number of users
	 */
	protected async doCount(
		_options?: CountOptions,
		_context?: RepositoryContext,
	): Promise<number> {
		try {
			const result = await this.db.select({ count: user.id }).from(user)

			return result.length
		} catch (error) {
			logError("UserRepository doCount error", error as Error)
			throw new InternalServerError("Failed to count users", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new user in the database.
	 *
	 * @param data - User creation data
	 * @param _context - Optional repository context
	 * @returns The created user
	 */
	protected async doCreate(
		data: NewUser,
		_context?: RepositoryContext,
	): Promise<User> {
		try {
			// Normalize email to lowercase
			const userData = {
				...data,
				email: data.email.toLowerCase(),
			}

			const [result] = await this.db
				.insert(user)
				.values(userData)
				.returning()

			if (!result) {
				throw new Error("Failed to create user - no result returned")
			}

			logDebug("UserRepository user created", { id: result.id })
			return result
		} catch (error) {
			logError("UserRepository doCreate error", error as Error, { data })
			throw new InternalServerError("Failed to create user", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update a user in the database.
	 *
	 * @param id - User ID
	 * @param data - User update data
	 * @param _context - Optional repository context
	 * @returns The updated user
	 */
	protected async doUpdate(
		id: string,
		data: UpdateUser,
		_context?: RepositoryContext,
	): Promise<User> {
		try {
			// Normalize email to lowercase if provided
			const updateData = {
				...data,
				...(data.email && { email: data.email.toLowerCase() }),
			}

			const [result] = await this.db
				.update(user)
				.set(updateData)
				.where(eq(user.id, id))
				.returning()

			if (!result) {
				throw new Error(`User not found: ${id}`)
			}

			logDebug("UserRepository user updated", { id })
			return result
		} catch (error) {
			logError("UserRepository doUpdate error", error as Error, {
				id,
				data,
			})
			throw new InternalServerError(`Failed to update user: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a user from the database.
	 *
	 * @param id - User ID
	 * @param _context - Optional repository context
	 * @returns true if deleted successfully
	 */
	protected async doDelete(
		id: string,
		_context?: RepositoryContext,
	): Promise<boolean> {
		try {
			const [result] = await this.db
				.delete(user)
				.where(eq(user.id, id))
				.returning({ id: user.id })

			const success = !!result
			if (success) {
				logDebug("UserRepository user deleted", { id })
			}
			return success
		} catch (error) {
			logError("UserRepository doDelete error", error as Error, { id })
			throw new InternalServerError(`Failed to delete user: ${id}`, {
				id,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// User-Specific Methods
	// =============================================================================

	/**
	 * Find a user by email address.
	 * Used for authentication and user lookup.
	 *
	 * @param email - User email address
	 * @returns The user or null if not found
	 */
	async findByEmail(email: string): Promise<User | null> {
		try {
			const normalizedEmail = email.toLowerCase()
			const [result] = await this.db
				.select()
				.from(user)
				.where(eq(user.email, normalizedEmail))

			return result ?? null
		} catch (error) {
			logError("UserRepository findByEmail error", error as Error, {
				email,
			})
			throw new InternalServerError(
				`Failed to find user by email: ${email}`,
				{
					email,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Find a user by email with password hash included.
	 * Use ONLY for authentication flows - password hash must never be exposed.
	 *
	 * SECURITY: This method bypasses the cache to prevent password hash leakage.
	 *
	 * @param email - User email address
	 * @returns The user with password hash or null if not found
	 */
	async findByEmailWithPassword(
		email: string,
	): Promise<UserWithPassword | null> {
		try {
			const normalizedEmail = email.toLowerCase()
			const [result] = await this.db
				.select()
				.from(user)
				.where(eq(user.email, normalizedEmail))

			if (!result) {
				return null
			}

			// Return with password hash for authentication
			return result as UserWithPassword
		} catch (error) {
			logError(
				"UserRepository findByEmailWithPassword error",
				error as Error,
				{
					email,
				},
			)
			throw new InternalServerError(
				`Failed to find user by email with password: ${email}`,
				{
					email,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Update the last login timestamp for a user.
	 * Called after successful authentication.
	 *
	 * @param userId - User ID
	 * @returns The updated user
	 */
	async updateLastLogin(userId: string): Promise<User> {
		try {
			const [result] = await this.db
				.update(user)
				.set({ lastLogin: new Date() })
				.where(eq(user.id, userId))
				.returning()

			if (!result) {
				throw new Error(`User not found: ${userId}`)
			}

			// Invalidate cache after update
			await this.invalidateCache(userId)

			logDebug("UserRepository last login updated", { id: userId })
			return result
		} catch (error) {
			logError("UserRepository updateLastLogin error", error as Error, {
				userId,
			})
			throw new InternalServerError(
				`Failed to update last login for user: ${userId}`,
				{
					userId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Check if a user exists by email address.
	 * Used during registration to check for duplicate emails.
	 *
	 * @param email - User email address
	 * @returns true if a user with this email exists
	 */
	async existsByEmail(email: string): Promise<boolean> {
		try {
			const normalizedEmail = email.toLowerCase()
			const [result] = await this.db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, normalizedEmail))
				.limit(1)

			return !!result
		} catch (error) {
			logError("UserRepository existsByEmail error", error as Error, {
				email,
			})
			throw new InternalServerError(
				`Failed to check email existence: ${email}`,
				{
					email,
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
 * Singleton instance of UserRepository.
 * Use this for all user data access operations.
 */
export const userRepository = new UserRepository()
