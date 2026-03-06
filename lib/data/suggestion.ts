import { eq } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { suggestions } from "@/lib/db/schema"
import type { NewSuggestion, Suggestion } from "@/lib/types/models.types"

/**
 * Get all suggestions for an artifact by its ID.
 * Uses artifactId (NOT documentId).
 */
export async function getSuggestionsByArtifactId(artifactId: string): Promise<Suggestion[]> {
	try {
		return await db.select().from(suggestions).where(eq(suggestions.artifactId, artifactId))
	} catch (error) {
		throwDatabaseError(error, "Failed to get suggestions for artifact", { artifactId })
	}
}

/**
 * Batch insert multiple suggestions.
 */
export async function saveSuggestions(data: NewSuggestion[]): Promise<Suggestion[]> {
	if (data.length === 0) return []
	try {
		return await db.insert(suggestions).values(data).returning()
	} catch (error) {
		throwDatabaseError(error, "Failed to save suggestions", { count: data.length })
	}
}

/**
 * Delete all suggestions for an artifact by its ID.
 *
 * @unused Retained for targeted suggestion cleanup without
 * removing the parent artifact.
 */
export async function deleteSuggestionsByArtifactId(artifactId: string): Promise<void> {
	try {
		await db.delete(suggestions).where(eq(suggestions.artifactId, artifactId))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete suggestions for artifact", { artifactId })
	}
}
