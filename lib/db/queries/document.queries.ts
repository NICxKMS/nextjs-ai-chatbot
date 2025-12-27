/**
 * Document Queries
 * @module @/lib/db/queries/document
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { type Document, document, type NewDocument } from "../schema";

export async function findDocumentById(id: string): Promise<Document | null> {
	const result = await db
		.select()
		.from(document)
		.where(eq(document.id, id))
		.limit(1);
	return result[0] ?? null;
}

export async function findDocumentsByUserId(
	userId: string,
): Promise<Document[]> {
	return db
		.select()
		.from(document)
		.where(eq(document.userId, userId))
		.orderBy(desc(document.createdAt));
}

export async function createDocument(data: NewDocument): Promise<Document> {
	const result = await db.insert(document).values(data).returning();
	if (!result[0]) throw new Error("Failed to create document");
	return result[0];
}

export async function updateDocument(
	id: string,
	userId: string,
	data: Partial<NewDocument>,
): Promise<Document | null> {
	const result = await db
		.update(document)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(document.id, id), eq(document.userId, userId)))
		.returning();
	return result[0] ?? null;
}

export async function deleteDocument(
	id: string,
	userId: string,
): Promise<boolean> {
	const result = await db
		.delete(document)
		.where(and(eq(document.id, id), eq(document.userId, userId)))
		.returning({ id: document.id });
	return result.length > 0;
}
