import { eq } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import type { NewUser, User } from "@/lib/types/models.types"

/**
 * Get a user by email address.
 * Returns null when not found — does not throw.
 *
 * @unused Auth uses Supabase SDK for email lookup.
 * Retained for direct DB email lookup scenarios.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	try {
		const result = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.limit(1)
		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get user by email")
	}
}

/**
 * Get a user by their unique ID.
 * Returns null when not found — does not throw.
 */
export async function getUserById(id: string): Promise<User | null> {
	try {
		const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
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
 * @unused Login flow does not yet track last login.
 * Retained for session tracking when implemented.
 */
export async function updateUserLastLogin(id: string): Promise<void> {
	try {
		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id))
	} catch (error) {
		throwDatabaseError(error, "Failed to update user last login")
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
