/**
 * Artifact Suggestion Actions
 *
 * Server actions for AI-generated artifact suggestions.
 *
 * @module features/artifact/actions/suggestions
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import { artifactService } from "@/lib/data/services/artifact.service"
import type { Artifact, Suggestion } from "@/lib/db/schema"

// =============================================================================
// Types
// =============================================================================

/**
 * Parameters for adding a suggestion
 */
export interface AddSuggestionParams {
	/** Original text being modified */
	originalText: string
	/** Suggested replacement text */
	suggestedText: string
	/** Suggestion description */
	description?: string
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Get suggestions for an artifact.
 *
 * Returns all suggestions associated with the artifact.
 *
 * @param artifactId - Artifact ID
 * @returns Array of suggestions
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * const suggestions = await getSuggestions('artifact-123');
 * suggestions.forEach(s => {
 *   console.log(`${s.originalText} → ${s.suggestedText}`);
 * });
 * ```
 */
export async function getSuggestions(
	artifactId: string,
): Promise<Suggestion[]> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get suggestions via service
	return await artifactService.getSuggestions(artifactId, ctx)
}

/**
 * Add a suggestion to an artifact.
 *
 * Creates a new suggestion for modifying the artifact content.
 * Suggestions can be applied later to update the artifact.
 *
 * @param artifactId - Artifact ID
 * @param params - Suggestion parameters
 * @returns The created suggestion
 * @throws UnauthorizedError if not authenticated
 * @throws NotFoundError if the artifact doesn't exist
 *
 * @example
 * ```typescript
 * const suggestion = await addSuggestion('artifact-123', {
 *   originalText: 'Hello World',
 *   suggestedText: 'Hello, World!',
 *   description: 'Add comma for better readability'
 * });
 * ```
 */
export async function addSuggestion(
	artifactId: string,
	params: AddSuggestionParams,
): Promise<Suggestion> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Add suggestion via service
	const suggestion = await artifactService.addSuggestion(
		artifactId,
		params,
		ctx,
	)

	return suggestion
}

/**
 * Apply a suggestion to an artifact.
 *
 * Applies the suggested text change to the artifact content,
 * creating a new version. The suggestion is marked as resolved.
 *
 * @param artifactId - Artifact ID
 * @param suggestionId - Suggestion ID to apply
 * @returns The updated artifact (new version)
 * @throws UnauthorizedError if not authenticated
 * @throws NotFoundError if the artifact or suggestion doesn't exist
 *
 * @example
 * ```typescript
 * const updated = await applySuggestion('artifact-123', 'suggestion-456');
 * console.log('Artifact updated:', updated.id);
 * ```
 */
export async function applySuggestion(
	artifactId: string,
	suggestionId: string,
): Promise<Artifact> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get the suggestion to apply
	const suggestions = await artifactService.getSuggestions(artifactId, ctx)
	const suggestion = suggestions.find((s) => s.id === suggestionId)

	if (!suggestion) {
		throw new Error("Suggestion not found")
	}

	// Get current artifact content
	const artifact = await artifactService.getArtifact(artifactId, ctx)
	if (!artifact) {
		throw new Error("Artifact not found")
	}

	// Apply the suggestion by replacing original text with suggested text
	const currentContent = artifact.content ?? ""
	const updatedContent = currentContent.replace(
		suggestion.originalText,
		suggestion.suggestedText,
	)

	// Update artifact with new content (creates new version)
	const updated = await artifactService.updateArtifact(
		artifactId,
		{ content: updatedContent },
		ctx,
	)

	// Revalidate relevant paths
	revalidatePath(`/chat/${updated.chatId}`)

	return updated
}

/**
 * Reject a suggestion.
 *
 * Deletes the suggestion without applying its changes to the artifact.
 *
 * @param artifactId - Artifact ID
 * @param suggestionId - Suggestion ID to reject
 * @returns true if the suggestion was successfully rejected
 * @throws UnauthorizedError if not authenticated
 * @throws NotFoundError if the suggestion doesn't exist
 *
 * @example
 * ```typescript
 * await rejectSuggestion('artifact-123', 'suggestion-456');
 * console.log('Suggestion rejected');
 * ```
 */
export async function rejectSuggestion(
	artifactId: string,
	suggestionId: string,
): Promise<boolean> {
	// Require authentication
	const userId = await requireAuthAction()

	// Create session context for repository operations
	const ctx = {
		userId,
		isGuest: false,
	}

	// Get the suggestion to verify it exists and belongs to the artifact
	const suggestions = await artifactService.getSuggestions(artifactId, ctx)
	const suggestion = suggestions.find((s) => s.id === suggestionId)

	if (!suggestion) {
		throw new Error("Suggestion not found")
	}

	// Delete the suggestion via service
	return await artifactService.deleteSuggestion(suggestionId, ctx)
}
