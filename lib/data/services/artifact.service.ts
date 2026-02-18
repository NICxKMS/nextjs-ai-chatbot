/**
 * Artifact Service
 *
 * Orchestration service for artifact operations with version management.
 * Coordinates artifact and suggestion repositories for business logic.
 *
 * @module lib/data/services/artifact.service
 */

import "server-only"

import type { Artifact, NewSuggestion, Suggestion } from "@/lib/db/schema"
import { InternalServerError, NotFoundError } from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

import {
	artifactRepository,
	type RepositoryContext,
	type SaveVersionParams,
	suggestionRepository,
} from "../repositories"

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
	suggestions: Suggestion[]
}

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

/**
 * Parameters for updating an artifact (creates new version)
 */
export interface UpdateArtifactParams {
	/** New title (optional) */
	title?: string
	/** New content (optional) */
	content?: string
	/** New kind (optional) */
	kind?: "text" | "code" | "image" | "sheet"
}

/**
 * Parameters for adding a suggestion
 */
export interface AddSuggestionParams {
	/** Original text being modified */
	originalText: string
	/** Suggested replacement text */
	suggestedText: string
	/** Suggestion content/description */
	description?: string
}

// =============================================================================
// Artifact Service Implementation
// =============================================================================

/**
 * Artifact service for orchestrating artifact and suggestion operations.
 *
 * Provides high-level business operations for artifact management with
 * version control support via composite primary key (id, createdAt).
 *
 * @example
 * ```typescript
 * const service = artifactService;
 *
 * // Create a new artifact
 * const artifact = await service.createArtifact(params, ctx);
 *
 * // Get artifact with suggestions
 * const result = await service.getWithSuggestions(artifactId, ctx);
 *
 * // Update artifact (creates new version)
 * const updated = await service.updateArtifact(artifactId, { content: '...' }, ctx);
 *
 * // Rollback to a specific timestamp
 * await service.rollbackToTimestamp(artifactId, timestamp, ctx);
 * ```
 */
class ArtifactService {
	// =============================================================================
	// Read Operations
	// =============================================================================

	/**
	 * Get an artifact by ID.
	 * Returns the latest version by default, or a specific version if createdAt is provided.
	 *
	 * @param artifactId - Artifact ID
	 * @param ctx - Repository context with user info
	 * @param version - Optional specific version timestamp (createdAt)
	 * @returns The artifact or null if not found
	 */
	async getArtifact(
		artifactId: string,
		ctx: RepositoryContext,
		version?: Date,
	): Promise<Artifact | null> {
		try {
			if (version) {
				// Get all versions and find the specific one
				const versions = await artifactRepository.findAllVersions(
					artifactId,
					ctx,
				)
				return (
					versions.find(
						(v) => v.createdAt.getTime() === version.getTime(),
					) ?? null
				)
			}

			// Get latest version
			return await artifactRepository.findLatestVersion(artifactId, ctx)
		} catch (error) {
			logError("ArtifactService getArtifact error", error as Error, {
				artifactId,
				version,
			})
			throw new InternalServerError("Failed to get artifact", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get all versions of an artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param ctx - Repository context with user info
	 * @returns Array of artifact versions (chronologically ordered)
	 */
	async getArtifactVersions(
		artifactId: string,
		ctx: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			return await artifactRepository.findAllVersions(artifactId, ctx)
		} catch (error) {
			logError(
				"ArtifactService getArtifactVersions error",
				error as Error,
				{
					artifactId,
				},
			)
			throw new InternalServerError("Failed to get artifact versions", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get an artifact with its suggestions.
	 *
	 * @param artifactId - Artifact ID
	 * @param ctx - Repository context with user info
	 * @returns Artifact with suggestions or null if not found
	 */
	async getWithSuggestions(
		artifactId: string,
		ctx: RepositoryContext,
	): Promise<ArtifactWithSuggestions | null> {
		try {
			const artifact = await artifactRepository.findLatestVersion(
				artifactId,
				ctx,
			)
			if (!artifact) {
				return null
			}

			const suggestions = await suggestionRepository.findByArtifactId(
				artifactId,
				ctx,
			)

			return { artifact, suggestions }
		} catch (error) {
			logError(
				"ArtifactService getWithSuggestions error",
				error as Error,
				{ artifactId },
			)
			throw new InternalServerError(
				"Failed to get artifact with suggestions",
				{
					artifactId,
					error: (error as Error).message,
				},
			)
		}
	}

	/**
	 * Get all artifacts for a chat.
	 *
	 * @param chatId - Chat ID
	 * @param ctx - Repository context with user info
	 * @returns Array of artifacts (latest versions)
	 */
	async getForChat(
		chatId: string,
		ctx: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			return await artifactRepository.findByChatId(chatId, ctx)
		} catch (error) {
			logError("ArtifactService getForChat error", error as Error, {
				chatId,
			})
			throw new InternalServerError("Failed to get artifacts for chat", {
				chatId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Get suggestions for an artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param ctx - Repository context with user info
	 * @returns Array of suggestions
	 */
	async getSuggestions(
		artifactId: string,
		ctx: RepositoryContext,
	): Promise<Suggestion[]> {
		try {
			return await suggestionRepository.findByArtifactId(artifactId, ctx)
		} catch (error) {
			logError("ArtifactService getSuggestions error", error as Error, {
				artifactId,
			})
			throw new InternalServerError("Failed to get suggestions", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	// =============================================================================
	// Write Operations
	// =============================================================================

	/**
	 * Create a new artifact.
	 *
	 * @param params - Creation parameters
	 * @param ctx - Repository context with user info
	 * @returns The created artifact
	 */
	async createArtifact(
		params: CreateArtifactParams,
		ctx: RepositoryContext,
	): Promise<Artifact> {
		try {
			const artifactId = crypto.randomUUID()

			const versionParams: SaveVersionParams = {
				id: artifactId,
				chatId: params.chatId,
				title: params.title,
				kind: params.kind,
				content: params.content,
			}

			const result = await artifactRepository.saveVersion(
				versionParams,
				ctx,
			)

			logDebug("ArtifactService artifact created", { id: result.id })
			return result
		} catch (error) {
			logError("ArtifactService createArtifact error", error as Error, {
				params,
			})
			throw new InternalServerError("Failed to create artifact", {
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Update an artifact by creating a new version.
	 *
	 * @param artifactId - Artifact ID
	 * @param params - Update parameters
	 * @param ctx - Repository context with user info
	 * @returns The new artifact version
	 */
	async updateArtifact(
		artifactId: string,
		params: UpdateArtifactParams,
		ctx: RepositoryContext,
	): Promise<Artifact> {
		try {
			// Get current version
			const current = await artifactRepository.findLatestVersion(
				artifactId,
				ctx,
			)
			if (!current) {
				throw new NotFoundError("Artifact", artifactId)
			}

			// Create new version with updated data
			const versionParams: SaveVersionParams = {
				id: artifactId,
				chatId: current.chatId,
				title: params.title ?? current.title,
				kind: params.kind ?? current.kind,
				content: params.content ?? current.content ?? "",
			}

			const result = await artifactRepository.saveVersion(
				versionParams,
				ctx,
			)

			logDebug("ArtifactService artifact updated (new version)", {
				id: result.id,
				createdAt: result.createdAt,
			})
			return result
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ArtifactService updateArtifact error", error as Error, {
				artifactId,
				params,
			})
			throw new InternalServerError("Failed to update artifact", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete an artifact and all its versions.
	 *
	 * @param artifactId - Artifact ID
	 * @param ctx - Repository context with user info
	 * @returns true if deleted successfully
	 */
	async deleteArtifact(
		artifactId: string,
		ctx: RepositoryContext,
	): Promise<boolean> {
		try {
			// Delete associated suggestions first
			await suggestionRepository.deleteByArtifactId(artifactId)

			// Delete all versions
			const success = await artifactRepository.delete(artifactId, ctx)

			if (success) {
				logDebug("ArtifactService artifact deleted", { artifactId })
			}
			return success
		} catch (error) {
			logError("ArtifactService deleteArtifact error", error as Error, {
				artifactId,
			})
			throw new InternalServerError("Failed to delete artifact", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Rollback an artifact to a specific timestamp.
	 * Deletes all versions created after the timestamp.
	 *
	 * @param artifactId - Artifact ID
	 * @param timestamp - Rollback point (versions after this will be deleted)
	 * @param ctx - Repository context with user info
	 * @returns Array of deleted versions
	 */
	async rollbackToTimestamp(
		artifactId: string,
		timestamp: Date,
		ctx: RepositoryContext,
	): Promise<Artifact[]> {
		try {
			const deleted =
				await artifactRepository.deleteVersionsAfterTimestamp(
					artifactId,
					timestamp,
					ctx,
				)

			logDebug("ArtifactService rollback completed", {
				artifactId,
				timestamp,
				versionsDeleted: deleted.length,
			})
			return deleted
		} catch (error) {
			logError(
				"ArtifactService rollbackToTimestamp error",
				error as Error,
				{
					artifactId,
					timestamp,
				},
			)
			throw new InternalServerError("Failed to rollback artifact", {
				artifactId,
				timestamp,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Add a suggestion to an artifact.
	 *
	 * @param artifactId - Artifact ID
	 * @param params - Suggestion parameters
	 * @param ctx - Repository context with user info
	 * @returns The created suggestion
	 */
	async addSuggestion(
		artifactId: string,
		params: AddSuggestionParams,
		ctx: RepositoryContext,
	): Promise<Suggestion> {
		try {
			// Verify artifact exists
			const artifact = await artifactRepository.findLatestVersion(
				artifactId,
				ctx,
			)
			if (!artifact) {
				throw new NotFoundError("Artifact", artifactId)
			}

			const suggestionData: NewSuggestion = {
				id: crypto.randomUUID(),
				artifactId,
				artifactCreatedAt: artifact.createdAt,
				userId: ctx.userId,
				originalText: params.originalText,
				suggestedText: params.suggestedText,
				description: params.description ?? null,
				isResolved: false,
			}

			const result = await suggestionRepository.create(
				suggestionData,
				ctx,
			)

			logDebug("ArtifactService suggestion added", {
				id: result.id,
				artifactId,
			})
			return result
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ArtifactService addSuggestion error", error as Error, {
				artifactId,
				params,
			})
			throw new InternalServerError("Failed to add suggestion", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Add multiple suggestions to an artifact in batch.
	 *
	 * @param artifactId - Artifact ID
	 * @param suggestions - Array of suggestion parameters
	 * @param ctx - Repository context with user info
	 * @returns Array of created suggestions
	 */
	async addSuggestions(
		artifactId: string,
		suggestions: AddSuggestionParams[],
		ctx: RepositoryContext,
	): Promise<Suggestion[]> {
		try {
			// Verify artifact exists
			const artifact = await artifactRepository.findLatestVersion(
				artifactId,
				ctx,
			)
			if (!artifact) {
				throw new NotFoundError("Artifact", artifactId)
			}

			const results: Suggestion[] = []

			// Create all suggestions
			for (const params of suggestions) {
				const suggestionData: NewSuggestion = {
					id: crypto.randomUUID(),
					artifactId,
					artifactCreatedAt: artifact.createdAt,
					userId: ctx.userId,
					originalText: params.originalText,
					suggestedText: params.suggestedText,
					description: params.description ?? null,
					isResolved: false,
				}

				const result = await suggestionRepository.create(
					suggestionData,
					ctx,
				)
				results.push(result)
			}

			logDebug("ArtifactService suggestions added in batch", {
				artifactId,
				count: results.length,
			})
			return results
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ArtifactService addSuggestions error", error as Error, {
				artifactId,
				count: suggestions.length,
			})
			throw new InternalServerError("Failed to add suggestions", {
				artifactId,
				error: (error as Error).message,
			})
		}
	}

	/**
	 * Delete a suggestion from an artifact.
	 * Used when a suggestion is rejected by the user.
	 *
	 * @param suggestionId - Suggestion ID to delete
	 * @param ctx - Repository context with user info
	 * @returns true if deleted successfully
	 * @throws NotFoundError if the suggestion doesn't exist
	 */
	async deleteSuggestion(
		suggestionId: string,
		ctx: RepositoryContext,
	): Promise<boolean> {
		try {
			// Verify suggestion exists and belongs to user
			const suggestion = await suggestionRepository.findById(
				suggestionId,
				ctx,
			)
			if (!suggestion) {
				throw new NotFoundError("Suggestion", suggestionId)
			}

			// Delete the suggestion
			const success = await suggestionRepository.delete(suggestionId, ctx)

			if (success) {
				logDebug("ArtifactService suggestion deleted", {
					id: suggestionId,
					artifactId: suggestion.artifactId,
				})
			}
			return success
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error
			}
			logError("ArtifactService deleteSuggestion error", error as Error, {
				suggestionId,
			})
			throw new InternalServerError("Failed to delete suggestion", {
				suggestionId,
				error: (error as Error).message,
			})
		}
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton instance of ArtifactService
 */
export const artifactService = new ArtifactService()
