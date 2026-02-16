/**
 * Artifact Version Actions
 *
 * Server actions for artifact version management including
 * version history retrieval and rollback functionality.
 *
 * @module features/artifact/actions/versions
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import { artifactService } from "@/lib/data/services/artifact.service"
import type { Artifact } from "@/lib/db/schema"

// =============================================================================
// Types
// =============================================================================

/**
 * Version info for display purposes
 */
export interface VersionInfo {
	/** Artifact ID (same for all versions) */
	id: string
	/** Version creation timestamp */
	createdAt: Date
	/** Title at this version */
	title: string
	/** Content at this version */
	content: string | null
	/** Kind at this version */
	kind: "text" | "code" | "image" | "sheet"
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Get version history for an artifact.
 *
 * Returns all versions of an artifact in chronological order (oldest first).
 *
 * @param artifactId - Artifact ID
 * @returns Array of artifact versions
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const versions = await getVersionHistory('artifact-123');
 * versions.forEach((v, i) => {
 *   console.log(`Version ${i + 1}: ${v.createdAt.toISOString()}`);
 * });
 * ```
 */
export async function getVersionHistory(
	artifactId: string,
): Promise<Artifact[]> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get all versions via service
	return await artifactService.getArtifactVersions(artifactId, ctx)
}

/**
 * Rollback an artifact to a specific timestamp.
 *
 * Deletes all versions created after the specified timestamp,
 * effectively restoring the artifact to its state at that point.
 *
 * @param artifactId - Artifact ID
 * @param timestamp - Rollback point (versions after this will be deleted)
 * @returns Array of deleted versions
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * // Rollback to a specific date
 * const deleted = await rollbackToVersion('artifact-123', new Date('2024-01-15'));
 * console.log(`Deleted ${deleted.length} versions`);
 * ```
 */
export async function rollbackToVersion(
	artifactId: string,
	timestamp: Date,
): Promise<Artifact[]> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get artifact first to get chatId for revalidation
	const artifact = await artifactService.getArtifact(artifactId, ctx)
	const chatId = artifact?.chatId

	// Perform rollback via service
	const deletedVersions = await artifactService.rollbackToTimestamp(
		artifactId,
		timestamp,
		ctx,
	)

	// Revalidate relevant paths
	if (chatId) {
		revalidatePath(`/chat/${chatId}`)
	}

	return deletedVersions
}

/**
 * Get a specific version of an artifact.
 *
 * Retrieves a specific version by its creation timestamp.
 *
 * @param artifactId - Artifact ID
 * @param versionTimestamp - Version creation timestamp
 * @returns The artifact version or null if not found
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const version = await getArtifactVersion('artifact-123', new Date('2024-01-15T10:30:00Z'));
 * if (version) {
 *   console.log('Version content:', version.content);
 * }
 * ```
 */
export async function getArtifactVersion(
	artifactId: string,
	versionTimestamp: Date,
): Promise<Artifact | null> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get specific version via service
	return await artifactService.getArtifact(artifactId, ctx, versionTimestamp)
}
