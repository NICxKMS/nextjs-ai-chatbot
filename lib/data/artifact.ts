import { and, desc, eq, gte } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { artifacts } from "@/lib/db/schema"
import type { Artifact, ArtifactKind } from "@/lib/types/models.types"

/**
 * Get the latest version of an artifact (highest createdAt for the given id).
 */
export async function getArtifactById(artifactId: string): Promise<Artifact | null> {
	try {
		const result = await db
			.select()
			.from(artifacts)
			.where(eq(artifacts.id, artifactId))
			.orderBy(desc(artifacts.createdAt))
			.limit(1)

		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get artifact", { artifactId })
	}
}

/**
 * Get a specific artifact version by its composite key.
 */
export async function getArtifactByIdAndCreatedAt(
	artifactId: string,
	createdAt: Date,
): Promise<Artifact | null> {
	try {
		const result = await db
			.select()
			.from(artifacts)
			.where(and(eq(artifacts.id, artifactId), eq(artifacts.createdAt, createdAt)))
			.limit(1)

		return result[0] ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get artifact version", {
			artifactId,
			artifactCreatedAt: createdAt.toISOString(),
		})
	}
}

/**
 * Get all versions of an artifact, ordered by createdAt descending (newest first).
 */
export async function getArtifactVersions(artifactId: string): Promise<Artifact[]> {
	try {
		return await db
			.select()
			.from(artifacts)
			.where(eq(artifacts.id, artifactId))
			.orderBy(desc(artifacts.createdAt))
	} catch (error) {
		throwDatabaseError(error, "Failed to get artifact versions", { artifactId })
	}
}

/**
 * Insert a new artifact version row. Versioning is achieved via the composite
 * primary key (id + createdAt) — each call creates a new version.
 */
export async function saveArtifactVersion(data: {
	id: string
	title: string
	content: string
	kind: ArtifactKind
	userId: string
	chatId: string
}): Promise<Artifact> {
	try {
		const result = await db
			.insert(artifacts)
			.values({
				id: data.id,
				title: data.title,
				content: data.content,
				kind: data.kind,
				userId: data.userId,
				chatId: data.chatId,
			})
			.returning()

		return requireDatabaseRow(result[0], "Artifact insert returned no rows", {
			id: data.id,
		})
	} catch (error) {
		throwDatabaseError(error, "Failed to save artifact version", { id: data.id })
	}
}

/**
 * Delete a specific artifact version, or all versions at/after a given timestamp.
 * Uses the composite PK (id + createdAt) for targeted deletion.
 */
export async function deleteArtifactVersion(artifactId: string, createdAt: Date): Promise<void> {
	try {
		await db
			.delete(artifacts)
			.where(and(eq(artifacts.id, artifactId), gte(artifacts.createdAt, createdAt)))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete artifact version", { artifactId })
	}
}
