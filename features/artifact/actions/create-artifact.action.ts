/**
 * Create Artifact Action
 *
 * Server action for creating a new artifact with versioning support.
 *
 * @module features/artifact/actions/create-artifact.action
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
 * Parameters for creating a new artifact
 */
export interface CreateArtifactParams {
	/** Chat ID this artifact belongs to */
	chatId: string
	/** Artifact title */
	title: string
	/** Artifact kind/type */
	kind: "text" | "code" | "image" | "sheet"
	/** Artifact content */
	content: string
}

// =============================================================================
// Action
// =============================================================================

/**
 * Create a new artifact.
 *
 * Creates a new artifact with the provided parameters. The artifact is
 * automatically associated with the current user's session.
 *
 * @param params - Creation parameters
 * @returns The created artifact
 * @throws UnauthorizedError if not authenticated
 * @throws NotFoundError if the chat doesn't exist
 *
 * @example
 * ```typescript
 * const artifact = await createArtifact({
 *   chatId: 'chat-123',
 *   title: 'My Document',
 *   kind: 'text',
 *   content: '# Hello World'
 * });
 * ```
 */
export async function createArtifact(
	params: CreateArtifactParams,
): Promise<Artifact> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	// userId is guaranteed to be non-null after requireAuthAction
	const ctx = {
		userId,
		isGuest: false,
	}

	// Create artifact via service
	const artifact = await artifactService.createArtifact(
		{
			chatId: params.chatId,
			title: params.title,
			kind: params.kind,
			content: params.content,
		},
		ctx,
	)

	// Revalidate relevant paths
	revalidatePath(`/chat/${params.chatId}`)

	return artifact
}
