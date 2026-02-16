/**
 * Suggestions Tool
 *
 * AI tool for generating improvement suggestions for document content.
 * Uses AI to analyze text and provide specific, actionable suggestions.
 *
 * @module features/chat/lib/tools/suggestions.tool
 */

import { streamObject, tool, type UIMessageStreamWriter } from "ai"
import { z } from "zod"
import type { ChatMessage, StreamingSuggestion } from "@/features/chat/types"
import { artifactService } from "@/lib/data/services/artifact.service"
import { ToolExecutionError } from "./errors"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default timeout for suggestion generation (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Maximum number of suggestions to generate
 */
const MAX_SUGGESTIONS = 5

// =============================================================================
// Types
// =============================================================================

/**
 * Context required for suggestions tool
 */
export interface SuggestionsContext {
	/** User session ID */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
	/** Data stream writer for sending updates to client */
	dataStream: UIMessageStreamWriter<ChatMessage>
	/** Optional AI model for generating suggestions */
	model?: Parameters<typeof streamObject>[0]["model"]
}

// =============================================================================
// Tool Factory
// =============================================================================

/**
 * Creates a suggestions tool with injected context.
 *
 * This is a factory function because the tool needs access to:
 * - User session information for authorization
 * - Data stream for real-time updates
 * - AI model for generating suggestions
 *
 * @param context - Tool execution context
 * @returns Configured tool instance
 *
 * @example
 * ```typescript
 * const tool = createSuggestionsTool({
 *   userId: session.user.id,
 *   isGuest: false,
 *   dataStream: writer,
 *   model: myProvider.languageModel('artifact-model'),
 * });
 * ```
 */
export function createSuggestionsTool(context: SuggestionsContext) {
	return tool({
		description:
			"Generate suggestions to improve the current document's content.",

		inputSchema: z.object({
			documentId: z
				.string()
				.describe("The ID of the document to request edits"),
		}),

		execute: async ({ documentId }) => {
			const timeoutMs = DEFAULT_TIMEOUT_MS

			try {
				// Get the existing artifact
				const artifact = await artifactService.getArtifact(documentId, {
					userId: context.userId,
					isGuest: context.isGuest,
				})

				if (!artifact || !artifact.content) {
					return {
						error: "Document not found",
					}
				}

				const suggestions: StreamingSuggestion[] = []

				// If no model is provided, return a placeholder response
				// This allows the tool to work without a model during migration
				if (!context.model) {
					// Generate placeholder suggestions for testing
					const placeholderSuggestion: StreamingSuggestion = {
						id: crypto.randomUUID(),
						artifactId: documentId,
						originalText: artifact.content.slice(0, 100),
						suggestedText:
							"[AI-generated suggestion would appear here]",
						description:
							"Configure the AI model to generate actual suggestions",
						isResolved: false,
					}

					context.dataStream.write({
						type: "data-suggestion",
						data: placeholderSuggestion,
						transient: true,
					})

					suggestions.push(placeholderSuggestion)
				} else {
					// Use AI to generate suggestions
					const { elementStream } = streamObject({
						model: context.model,
						system: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Ensure suggestions are complete sentences and clearly describe the change.",
						prompt: artifact.content,
						output: "array",
						schema: z.object({
							originalSentence: z
								.string()
								.describe("The original sentence"),
							suggestedSentence: z
								.string()
								.describe("The suggested sentence"),
							description: z
								.string()
								.describe("The description of the suggestion"),
						}),
					})

					// Process streamed suggestions
					for await (const element of elementStream) {
						const suggestion: StreamingSuggestion = {
							id: crypto.randomUUID(),
							artifactId: documentId,
							originalText: element.originalSentence,
							suggestedText: element.suggestedSentence,
							description: element.description,
							isResolved: false,
						}

						context.dataStream.write({
							type: "data-suggestion",
							data: suggestion,
							transient: true,
						})

						suggestions.push(suggestion)

						// Limit to max suggestions
						if (suggestions.length >= MAX_SUGGESTIONS) {
							break
						}
					}
				}

				// Save suggestions to database for authenticated users
				// Guest users cannot persist suggestions (cache-only constraint)
				if (!context.isGuest && suggestions.length > 0) {
					const firstSuggestion = suggestions[0]
					if (firstSuggestion) {
						await artifactService.addSuggestion(
							documentId,
							{
								originalText: firstSuggestion.originalText,
								suggestedText: firstSuggestion.suggestedText,
								description: firstSuggestion.description ?? "",
							},
							{
								userId: context.userId,
								isGuest: context.isGuest,
							},
						)
					}
				}

				return {
					id: documentId,
					title: artifact.title,
					kind: artifact.kind,
					message: "Suggestions have been added to the document",
					suggestionsCount: suggestions.length,
				}
			} catch (error) {
				// Handle timeout
				if (error instanceof Error && error.name === "AbortError") {
					throw ToolExecutionError.timeout(
						"requestSuggestions",
						timeoutMs,
					)
				}

				// Handle other errors
				throw ToolExecutionError.executionFailed(
					"requestSuggestions",
					error instanceof Error ? error.message : "Unknown error",
					error instanceof Error
						? { originalError: error }
						: undefined,
				)
			}
		},
	})
}

/**
 * Tool name for registration
 */
export const SUGGESTIONS_TOOL_NAME = "requestSuggestions" as const

// =============================================================================
// Legacy Export (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use createSuggestionsTool factory instead.
 *
 * Creates a suggestions tool with the legacy API signature.
 * This is provided for backward compatibility during migration.
 */
export const requestSuggestions = (params: {
	userId: string
	isGuest: boolean
	dataStream: UIMessageStreamWriter<ChatMessage>
	model?: Parameters<typeof streamObject>[0]["model"]
}) => {
	return createSuggestionsTool({
		userId: params.userId,
		isGuest: params.isGuest,
		dataStream: params.dataStream,
		...(params.model ? { model: params.model } : {}),
	})
}
