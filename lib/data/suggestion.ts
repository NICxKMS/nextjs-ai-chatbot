import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { suggestions } from "@/lib/db/schema"
import type { NewSuggestion, Suggestion } from "@/lib/types/models.types"

/**
 * Get all suggestions for an artifact by its ID.
 * Uses artifactId (NOT documentId).
 */
export async function getSuggestionsByArtifactId(artifactId: string): Promise<Suggestion[]> {
	return db.select().from(suggestions).where(eq(suggestions.artifactId, artifactId))
}

/**
 * Batch insert multiple suggestions.
 */
export async function saveSuggestions(data: NewSuggestion[]): Promise<Suggestion[]> {
	if (data.length === 0) return []
	return db.insert(suggestions).values(data).returning()
}

/**
 * Delete all suggestions for an artifact by its ID.
 */
export async function deleteSuggestionsByArtifactId(artifactId: string): Promise<void> {
	await db.delete(suggestions).where(eq(suggestions.artifactId, artifactId))
}
