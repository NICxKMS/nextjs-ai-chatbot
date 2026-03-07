import { desc, eq } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { artifacts } from "@/lib/db/schema"
import type { Artifact } from "@/lib/types/models.types"

export async function getLatestArtifactByChatId(
	chatId: string,
	userId: string,
): Promise<Artifact | null> {
	try {
		const result = await db
			.select()
			.from(artifacts)
			.where(eq(artifacts.chatId, chatId))
			.orderBy(desc(artifacts.createdAt))
			.limit(5)

		return result.find((artifact) => artifact.userId === userId) ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get latest chat artifact", { chatId, userId })
	}
}
