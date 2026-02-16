/**
 * Update Artifact Action
 *
 * Server action for updating an existing artifact (creates new version).
 *
 * @module features/artifact/actions/update-artifact.action
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
 * Parameters for updating an artifact
 */
export interface UpdateArtifactParams {
	/** New title (optional) */
	title?: string
	/** New content (optional) */
	content?: string
	/** New kind (optional) */
	kind?: "text" | "code" | "image" | "sheet"
}

// =============================================================================
// Action
// =============================================================================

/**
 * Update an existing artifact.
 *
 * Creates a new version of the artifact with the updated data.
 * The artifact uses a composite primary key (id, createdAt) for versioning.
 *
 * @param artifactId - Artifact ID to update
 * @param params - Update parameters
 * @returns The new artifact version
 * @throws UnauthorizedError if not authenticated
 * @throws NotFoundError if the artifact doesn't exist
 *
 * @example
 * ```typescript
 * const updated = await updateArtifact('artifact-123', {
 *   content: 'Updated content'
 * });
 * ```
 */
export async function updateArtifact(
	artifactId: string,
	params: UpdateArtifactParams,
): Promise<Artifact> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Update artifact via service (creates new version)
	const artifact = await artifactService.updateArtifact(
		artifactId,
		params,
		ctx,
	)

	// Revalidate relevant paths
	revalidatePath(`/chat/${artifact.chatId}`)

	return artifact
}
