/**
 * Auth Service
 *
 * Authentication-related data operations coordinating user repository
 * with session management. Handles credential verification, user registration,
 * and session context creation.
 *
 * @module lib/data/services/auth.service
 */

import "server-only"

import { compare, hash } from "bcrypt"

import type { NewUser, User } from "@/lib/db/schema"
import { InternalServerError, ValidationError } from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

import { type RepositoryContext, userRepository } from "../repositories"

// =============================================================================
// Constants
// =============================================================================

/** Number of salt rounds for bcrypt password hashing */
const SALT_ROUNDS = 12

// =============================================================================
// Types
// =============================================================================

/**
 * Credentials for authentication
 */
export interface AuthCredentials {
	/** User email address */
	email: string
	/** User password (plaintext) */
	password: string
}

/**
 * Parameters for user registration
 */
export interface RegisterParams {
	/** User email address */
	email: string
	/** User password (plaintext, will be hashed) */
	password: string
}

/**
 * User without password hash - safe for API responses
 */
export type SafeUser = Omit<User, "passwordHash">

/**
 * Result of authentication
 */
export interface AuthResult {
	/** Authenticated user (without password hash) */
	user: SafeUser
}

// =============================================================================
// Auth Service Implementation
// =============================================================================

/**
 * Auth service for authentication-related data operations.
 *
 * Provides credential verification, user registration with password hashing,
 * and session context utilities.
 *
 * @example
 * ```typescript
 * const service = authService;
 *
 * // Verify credentials
 * const result = await service.authenticate('user@example.com', 'password');
 * if (result) {
 *   console.log('Authenticated user:', result.user);
 * }
 *
 * // Register new user
 * const newUser = await service.createUser({
 *   email: 'new@example.com',
 *   password: 'securepassword',
 *   name: 'John Doe'
 * });
 *
 * // Create repository context from session
 * const ctx = service.createContext(session);
 * ```
 */
class AuthService {
	// =============================================================================
	// Authentication Operations
	// =============================================================================

	/**
	 * Authenticate a user with email and password.
	 * Verifies credentials and returns the user if valid.
	 *
	 * @param email - User email address
	 * @param password - User password (plaintext)
	 * @returns The authenticated user or null if credentials invalid
	 *
	 * @example
	 * ```typescript
	 * const result = await authService.authenticate('user@example.com', 'password');
	 * if (result) {
	 *   // Credentials valid
	 *   console.log('User ID:', result.user.id);
	 * } else {
	 *   // Invalid credentials
	 * }
	 * ```
	 */
	async authenticate(
		email: string,
		password: string,
	): Promise<AuthResult | null> {
		try {
			// Find user by email with password hash
			const userWithPassword =
				await userRepository.findByEmailWithPassword(email)

			if (!userWithPassword) {
				// User not found - return null (don't reveal existence)
				return null
			}

			// Check if user has a password hash (not OAuth-only)
			if (!userWithPassword.passwordHash) {
				return null
			}

			// Verify password
			const isValid = await compare(
				password,
				userWithPassword.passwordHash,
			)

			if (!isValid) {
				return null
			}

			// Update last login timestamp (non-blocking)
			this.updateLastLoginAsync(userWithPassword.id)

			// Return user without password hash
			const { passwordHash: _password, ...user } = userWithPassword

			logDebug("AuthService user authenticated", { id: user.id })

			return { user }
		} catch (error) {
			logError("AuthService authenticate error", error as Error, {
				email,
			})
			throw new InternalServerError("Authentication failed", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Create a new user with hashed password.
	 * Validates email uniqueness before creation.
	 *
	 * @param params - Registration parameters
	 * @returns The created user
	 * @throws ValidationError if email already exists
	 *
	 * @example
	 * ```typescript
	 * const user = await authService.createUser({
	 *   email: 'new@example.com',
	 *   password: 'securepassword'
	 * });
	 * ```
	 */
	async createUser(params: RegisterParams): Promise<User> {
		try {
			// Check if email already exists
			const exists = await userRepository.existsByEmail(params.email)
			if (exists) {
				throw new ValidationError("Email already registered", {
					email: params.email,
				})
			}

			// Hash password
			const passwordHash = await hash(params.password, SALT_ROUNDS)

			// Create user data
			const userData: NewUser = {
				id: crypto.randomUUID(),
				email: params.email.toLowerCase(),
				passwordHash,
				createdAt: new Date(),
				lastLogin: new Date(),
			}

			const user = await userRepository.create(userData)

			logDebug("AuthService user created", {
				id: user.id,
				email: user.email,
			})

			return user
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error
			}
			logError("AuthService createUser error", error as Error, {
				email: params.email,
			})
			throw new InternalServerError("Failed to create user", {
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// User Retrieval Operations
	// =============================================================================

	/**
	 * Get a user by ID.
	 *
	 * @param userId - User ID
	 * @returns The user or null if not found
	 */
	async getUserById(userId: string): Promise<User | null> {
		try {
			return await userRepository.findById(userId)
		} catch (error) {
			logError("AuthService getUserById error", error as Error, {
				userId,
			})
			throw new InternalServerError("Failed to get user", {
				userId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get a user by email address.
	 *
	 * @param email - User email address
	 * @returns The user or null if not found
	 */
	async getUserByEmail(email: string): Promise<User | null> {
		try {
			return await userRepository.findByEmail(email)
		} catch (error) {
			logError("AuthService getUserByEmail error", error as Error, {
				email,
			})
			throw new InternalServerError("Failed to get user by email", {
				email,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Guest User Operations
	// =============================================================================

	/**
	 * Create a guest user for anonymous access.
	 * Guest users have limited functionality and are identified by a special ID prefix.
	 *
	 * @returns The created guest user
	 *
	 * @example
	 * ```typescript
	 * const guestUser = await authService.createGuestUser();
	 * console.log('Guest ID:', guestUser.id); // 'guest:uuid...'
	 * ```
	 */
	async createGuestUser(): Promise<{ id: string; type: "guest" }> {
		const guestId = `guest:${crypto.randomUUID()}`

		logDebug("AuthService guest user created", { id: guestId })

		return {
			id: guestId,
			type: "guest",
		}
	}

	// =============================================================================
	// Context Utilities
	// =============================================================================

	/**
	 * Create a repository context from session information.
	 * Used to pass user context to repository operations.
	 *
	 * @param session - Application session
	 * @returns Repository context with user ID and guest status
	 *
	 * @example
	 * ```typescript
	 * const session = await getSession();
	 * const ctx = authService.createContext(session);
	 * // Use ctx in repository calls
	 * const chats = await chatRepository.findByUserId(ctx.userId, pagination, ctx);
	 * ```
	 */
	createContext(session: {
		user: { id: string; type: "guest" | "regular" }
	}): RepositoryContext {
		return {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}
	}

	/**
	 * Check if a session belongs to a guest user.
	 *
	 * @param session - Application session or null
	 * @returns true if the session is a guest session
	 */
	isGuest(
		session: { user: { id: string; type: "guest" | "regular" } } | null,
	): boolean {
		return session?.user.type === "guest"
	}

	// =============================================================================
	// Private Helpers
	// =============================================================================

	/**
	 * Update last login timestamp asynchronously (non-blocking).
	 * Errors are logged but not thrown.
	 *
	 * @param userId - User ID to update
	 */
	private async updateLastLoginAsync(userId: string): Promise<void> {
		try {
			await userRepository.updateLastLogin(userId)
		} catch (error) {
			// Log but don't throw - this is a non-critical operation
			logError("AuthService updateLastLogin error", error as Error, {
				userId,
			})
		}
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of AuthService.
 * Use this for all authentication-related data operations.
 */
export const authService = new AuthService()
