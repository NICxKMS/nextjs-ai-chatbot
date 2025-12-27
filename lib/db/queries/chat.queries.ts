/**
 * Chat Queries
 * @module @/lib/db/queries/chat
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { type Chat, chat, type NewChat } from "../schema";

export async function findChatById(id: string): Promise<Chat | null> {
	const result = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
	return result[0] ?? null;
}

export async function findChatsByUserId(userId: string): Promise<Chat[]> {
	return db
		.select()
		.from(chat)
		.where(eq(chat.userId, userId))
		.orderBy(desc(chat.createdAt));
}

export async function findChatByIdAndUserId(
	id: string,
	userId: string,
): Promise<Chat | null> {
	const result = await db
		.select()
		.from(chat)
		.where(and(eq(chat.id, id), eq(chat.userId, userId)))
		.limit(1);
	return result[0] ?? null;
}

export async function createChat(data: NewChat): Promise<Chat> {
	const result = await db.insert(chat).values(data).returning();
	if (!result[0]) throw new Error("Failed to create chat");
	return result[0];
}

export async function updateChat(
	id: string,
	userId: string,
	data: Partial<NewChat>,
): Promise<Chat | null> {
	const result = await db
		.update(chat)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(chat.id, id), eq(chat.userId, userId)))
		.returning();
	return result[0] ?? null;
}

export async function deleteChat(id: string, userId: string): Promise<boolean> {
	const result = await db
		.delete(chat)
		.where(and(eq(chat.id, id), eq(chat.userId, userId)))
		.returning({ id: chat.id });
	return result.length > 0;
}
