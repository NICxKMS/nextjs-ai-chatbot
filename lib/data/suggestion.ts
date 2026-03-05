import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { suggestions } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
import type { NewSuggestion, Suggestion } from "@/lib/types/models.types"

/**
 * Get all suggestions for an artifact by its ID.
 * Uses artifactId (NOT documentId).
 */
export async function getSuggestionsByArtifactId(artifactId: string): Promise<Suggestion[]> {
	try {
		return await db.select().from(suggestions).where(eq(suggestions.artifactId, artifactId))
	} catch (error) {
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to get suggestions for artifact",
			{ artifactId, cause: error },
		)
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to save suggestions",
			{ count: data.length, cause: error },
		)
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
		if (error instanceof AppError) throw error
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Failed to delete suggestions for artifact",
			{ artifactId, cause: error },
		)
	}
}
