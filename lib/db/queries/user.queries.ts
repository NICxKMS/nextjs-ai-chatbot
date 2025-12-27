/**
 * User Queries
 * @module @/lib/db/queries/user
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { type NewUser, type User, user } from "../schema";

export async function findUserById(id: string): Promise<User | null> {
	const result = await db.select().from(user).where(eq(user.id, id)).limit(1);
	return result[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const result = await db
		.select()
		.from(user)
		.where(eq(user.email, email))
		.limit(1);
	return result[0] ?? null;
}

export async function createUser(data: NewUser): Promise<User> {
	const result = await db.insert(user).values(data).returning();
	if (!result[0]) throw new Error("Failed to create user");
	return result[0];
}

export async function updateUser(
	id: string,
	data: Partial<NewUser>,
): Promise<User | null> {
	const result = await db
		.update(user)
		.set(data)
		.where(eq(user.id, id))
		.returning();
	return result[0] ?? null;
}

export async function deleteUser(id: string): Promise<boolean> {
	const result = await db
		.delete(user)
		.where(eq(user.id, id))
		.returning({ id: user.id });
	return result.length > 0;
}
