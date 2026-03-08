import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { artifacts } from "@/lib/db/schema"

type ArtifactRef = { id: string }

/**
 * Get the latest artifact reference for a chat owned by the given user.
 * Returns only the artifact id — callers needing full artifact data
 * should use `getArtifactById` from `artifact.ts`.
 */
export async function getLatestArtifactByChatId(
	chatId: string,
	userId: string,
): Promise<ArtifactRef | null> {
	try {
		const result = await db
			.select({ id: artifacts.id })
			.from(artifacts)
			.where(and(eq(artifacts.chatId, chatId), eq(artifacts.userId, userId)))
			.orderBy(desc(artifacts.createdAt))
			.limit(1)

		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get latest chat artifact", { chatId, userId })
	}
}
