/**
 * Message Queries
 * @module @/lib/db/queries/message
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { type Message, message, type NewMessage } from "../schema";

export async function findMessagesByChatId(chatId: string): Promise<Message[]> {
	return db
		.select()
		.from(message)
		.where(eq(message.chatId, chatId))
		.orderBy(asc(message.createdAt));
}

export async function createMessage(data: NewMessage): Promise<Message> {
	const result = await db.insert(message).values(data).returning();
	if (!result[0]) throw new Error("Failed to create message");
	return result[0];
}

export async function createMessages(data: NewMessage[]): Promise<Message[]> {
	if (data.length === 0) return [];
	return db.insert(message).values(data).returning();
}

export async function deleteMessagesByChatId(chatId: string): Promise<number> {
	const result = await db
		.delete(message)
		.where(eq(message.chatId, chatId))
		.returning({ id: message.id });
	return result.length;
}
