import "server-only"

import { and, desc, eq, gt } from "drizzle-orm"

import { requireDatabaseRow, throwDatabaseError } from "@/lib/data/database-error"
import { db } from "@/lib/db/client"
import { artifacts } from "@/lib/db/schema"
import type { Artifact, ArtifactKind } from "@/lib/types/entity.types"

/**
 * Get the owner userId of the latest artifact version.
 * Lightweight query — selects only userId. Not cached (used for authorization).
 */
export async function getArtifactOwnerId(artifactId: string): Promise<string | null> {
	try {
		const result = await db
			.select({ userId: artifacts.userId })
			.from(artifacts)
			.where(eq(artifacts.id, artifactId))
			.orderBy(desc(artifacts.createdAt))
			.limit(1)

		return result[0]?.userId ?? null
	} catch (error) {
		throwDatabaseError(error, "Failed to get artifact owner", { artifactId })
	}
}

/**
 * Get metadata for all versions of an artifact (no content column).
 * Returns only id, createdAt, title, and kind — ordered newest first.
 * Capped at `limit` rows (default 100) to prevent unbounded result sets.
 */
export async function getArtifactVersionsMeta(
	artifactId: string,
	limit = 100,
): Promise<{ id: string; createdAt: Date; title: string; kind: string }[]> {
	try {
		return await db
			.select({
				id: artifacts.id,
				createdAt: artifacts.createdAt,
				title: artifacts.title,
				kind: artifacts.kind,
			})
			.from(artifacts)
			.where(eq(artifacts.id, artifactId))
			.orderBy(desc(artifacts.createdAt))
			.limit(limit)
	} catch (error) {
		throwDatabaseError(error, "Failed to get artifact versions metadata", { artifactId })
	}
}

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
 * Capped at `limit` rows (default 100) to prevent unbounded result sets.
 */
export async function getArtifactVersions(artifactId: string, limit = 100): Promise<Artifact[]> {
	try {
		return await db
			.select()
			.from(artifacts)
			.where(eq(artifacts.id, artifactId))
			.orderBy(desc(artifacts.createdAt))
			.limit(limit)
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
 * Delete all artifact versions strictly after the given timestamp.
 * Uses the composite PK (id + createdAt) for targeted deletion.
 */
export async function deleteArtifactVersion(artifactId: string, createdAt: Date): Promise<void> {
	try {
		await db
			.delete(artifacts)
			.where(and(eq(artifacts.id, artifactId), gt(artifacts.createdAt, createdAt)))
	} catch (error) {
		throwDatabaseError(error, "Failed to delete artifact version", { artifactId })
	}
}
