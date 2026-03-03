import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
import type { NewUser, User } from "@/lib/types/models.types"

/**
 * Get a user by email address.
 * Returns null when not found — does not throw.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	try {
		const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
		return result[0] ?? null
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get user by email",
			error,
		)
	}
}

/**
 * Get a user by their unique ID.
 * Returns null when not found — does not throw.
 */
export async function getUserById(id: string): Promise<User | null> {
	try {
		const result = await db.select().from(users).where(eq(users.id, id))
		return result[0] ?? null
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get user by id",
			error,
		)
	}
}

/**
 * Create a new user in the database.
 * Wraps DB errors in AppError.
 */
export async function createUser(data: NewUser): Promise<User> {
	try {
		const [user] = await db.insert(users).values(data).returning()
		if (!user) {
			throw new Error("Insert did not return a row")
		}
		return user
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to create user",
			error,
		)
	}
}

/**
 * Update a user's last login timestamp to now.
 */
export async function updateUserLastLogin(id: string): Promise<void> {
	try {
		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id))
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to update user last login",
			error,
		)
	}
}
