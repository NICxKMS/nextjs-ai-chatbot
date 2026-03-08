import "server-only"

import { eq } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import type { NewUser, User } from "@/lib/types/entity.types"

/**
 * Get a user by their unique ID.
 * Returns null when not found — does not throw.
 */
export async function getUserById(id: string): Promise<Omit<User, "passwordHash"> | null> {
	try {
		const result = await db
			.select({
				id: users.id,
				email: users.email,
				createdAt: users.createdAt,
				lastLogin: users.lastLogin,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1)
		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get user by id")
	}
}

/**
 * Create a new user in the database.
 * Wraps DB errors in AppError.
 */
export async function createUser(data: NewUser): Promise<User> {
	try {
		const [user] = await db.insert(users).values(data).returning()
		return requireDatabaseRow(user, "Failed to create user")
	} catch (error) {
		throwDatabaseError(error, "Failed to create user")
	}
}

/**
 * Update a user's last login timestamp to now.
 *
 * Called fire-and-forget from the login action — non-critical,
 * must not block the login response.
 */
export async function updateUserLastLogin(id: string): Promise<void> {
	try {
		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id))
	} catch (error) {
		throwDatabaseError(error, "Failed to update user last login")
	}
}

/**
 * Delete a guest user row from the database.
 *
 * Called after successful guest-to-authenticated migration to
 * remove the orphaned guest user row. Non-critical — callers
 * should catch failures rather than propagating them.
 *
 * @param userId - The guest user UUID to delete
 */
export async function deleteGuestUser(userId: string): Promise<void> {
	try {
		await db.delete(users).where(eq(users.id, userId))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete guest user")
	}
}

/**
 * Ensure a guest user row exists in the database.
 *
 * Uses `ON CONFLICT DO NOTHING` to handle concurrent requests
 * for the same guest user gracefully.
 *
 * @param userId - The guest user UUID
 */
export async function ensureGuestUser(userId: string): Promise<void> {
	try {
		await db.insert(users).values({ id: userId }).onConflictDoNothing({ target: users.id })
	} catch (error) {
		throwDatabaseError(error, "Failed to ensure guest user exists")
	}
}
