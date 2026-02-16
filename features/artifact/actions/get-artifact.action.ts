/**
 * Get Artifact Action
 *
 * Server action for retrieving artifacts by ID or by chat.
 *
 * @module features/artifact/actions/get-artifact.action
 */

"use server"

import { requireAuthAction } from "@/lib/auth/guards"
import { artifactService } from "@/lib/data/services/artifact.service"
import type { Artifact } from "@/lib/db/schema"

// =============================================================================
// Types
// =============================================================================

/**
 * Artifact with its associated suggestions
 */
export interface ArtifactWithSuggestions {
	/** The artifact (latest version) */
	artifact: Artifact
	/** Suggestions for the artifact */
	suggestions: Array<{
		id: string
		artifactId: string
		artifactCreatedAt: Date
		userId: string
		originalText: string
		suggestedText: string
		description: string | null
		isResolved: boolean
		createdAt: Date | null
	}>
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Get an artifact by ID.
 *
 * Returns the latest version of the artifact by default,
 * or a specific version if createdAt timestamp is provided.
 *
 * @param artifactId - Artifact ID
 * @param version - Optional specific version timestamp (createdAt)
 * @returns The artifact or null if not found
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * // Get latest version
 * const artifact = await getArtifact('artifact-123');
 *
 * // Get specific version
 * const oldVersion = await getArtifact('artifact-123', new Date('2024-01-01'));
 * ```
 */
export async function getArtifact(
	artifactId: string,
	version?: Date,
): Promise<Artifact | null> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get artifact via service
	return await artifactService.getArtifact(artifactId, ctx, version)
}

/**
 * Get an artifact with its suggestions.
 *
 * @param artifactId - Artifact ID
 * @returns Artifact with suggestions or null if not found
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const result = await getArtifactWithSuggestions('artifact-123');
 * if (result) {
 *   console.log('Artifact:', result.artifact.title);
 *   console.log('Suggestions:', result.suggestions.length);
 * }
 * ```
 */
export async function getArtifactWithSuggestions(
	artifactId: string,
): Promise<ArtifactWithSuggestions | null> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get artifact with suggestions via service
	return await artifactService.getWithSuggestions(artifactId, ctx)
}

/**
 * Get all artifacts for a chat.
 *
 * Returns the latest version of each artifact associated with the chat.
 *
 * @param chatId - Chat ID
 * @returns Array of artifacts
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const artifacts = await getArtifactsByChat('chat-123');
 * artifacts.forEach(a => console.log(a.title));
 * ```
 */
export async function getArtifactsByChat(chatId: string): Promise<Artifact[]> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get artifacts for chat via service
	return await artifactService.getForChat(chatId, ctx)
}
