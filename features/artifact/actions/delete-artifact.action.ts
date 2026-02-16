/**
 * Delete Artifact Action
 *
 * Server action for deleting an artifact and all its versions.
 *
 * @module features/artifact/actions/delete-artifact.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import { artifactService } from "@/lib/data/services/artifact.service"

// =============================================================================
// Action
// =============================================================================

/**
 * Delete an artifact and all its versions.
 *
 * Permanently deletes the artifact, all its versions, and associated suggestions.
 * This action cannot be undone.
 *
 * @param artifactId - Artifact ID to delete
 * @returns true if deleted successfully
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const success = await deleteArtifact('artifact-123');
 * if (success) {
 *   console.log('Artifact deleted');
 * }
 * ```
 */
export async function deleteArtifact(artifactId: string): Promise<boolean> {
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

	// Delete artifact via service
	const success = await artifactService.deleteArtifact(artifactId, ctx)

	// Revalidate relevant paths if deletion was successful
	if (success && chatId) {
		revalidatePath(`/chat/${chatId}`)
	}

	return success
}
