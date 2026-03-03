import { and, desc, eq, gte } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { artifacts } from "@/lib/db/schema"
import { AppError } from "@/lib/errors/app-error"
import type { Artifact, ArtifactKind } from "@/lib/types/models.types"

/**
 * Get the latest version of an artifact (highest createdAt for the given id).
 */
export async function getArtifactById(artifactId: string): Promise<Artifact | null> {
	const result = await db
		.select()
		.from(artifacts)
		.where(eq(artifacts.id, artifactId))
		.orderBy(desc(artifacts.createdAt))
		.limit(1)

	return result[0] ?? null
}

/**
 * Get all versions of an artifact, ordered by createdAt descending (newest first).
 */
export async function getArtifactVersions(artifactId: string): Promise<Artifact[]> {
	return db
		.select()
		.from(artifacts)
		.where(eq(artifacts.id, artifactId))
		.orderBy(desc(artifacts.createdAt))
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

	const artifact = result[0]
	if (!artifact)
		throw AppError.internal(
			"internal_error:database:query_failed",
			"Artifact insert returned no rows",
			{ id: data.id },
		)
	return artifact
}

/**
 * Delete a specific artifact version, or all versions at/after a given timestamp.
 * Uses the composite PK (id + createdAt) for targeted deletion.
 */
export async function deleteArtifactVersion(artifactId: string, createdAt: Date): Promise<void> {
	await db
		.delete(artifacts)
		.where(and(eq(artifacts.id, artifactId), gte(artifacts.createdAt, createdAt)))
}
