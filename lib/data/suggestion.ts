import "server-only"

import { and, eq } from "drizzle-orm"

import { throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { suggestions } from "@/lib/db/schema"
import type { NewSuggestion, Suggestion } from "@/lib/types/entity.types"

/**
 * Get all suggestions for a specific artifact version.
 */
export async function getSuggestionsByArtifactVersion(
	artifactId: string,
	artifactCreatedAt: Date,
): Promise<Suggestion[]> {
	try {
		return await db
			.select()
			.from(suggestions)
			.where(
				and(
					eq(suggestions.artifactId, artifactId),
					eq(suggestions.artifactCreatedAt, artifactCreatedAt),
				),
			)
	} catch (error) {
		throwDatabaseError(error, "Failed to get suggestions for artifact version", {
			artifactId,
			artifactCreatedAt: artifactCreatedAt.toISOString(),
		})
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
