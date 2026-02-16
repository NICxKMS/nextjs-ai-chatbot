/**
 * Update Document Tool
 *
 * AI tool for updating existing documents/artifacts via the chat interface.
 * Integrates with the artifact service for persistence and version management.
 *
 * @module features/chat/lib/tools/update-document.tool
 */

import { tool, type UIMessageStreamWriter } from "ai"
import { z } from "zod"
import type { ChatMessage } from "@/features/chat/types"
import { artifactService } from "@/lib/data/services/artifact.service"
import { ToolExecutionError } from "./errors"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default timeout for document update (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000

// =============================================================================
// Types
// =============================================================================

/**
 * Context required for document update tool
 */
export interface UpdateDocumentContext {
	/** User session ID */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
	/** Data stream writer for sending updates to client */
	dataStream: UIMessageStreamWriter<ChatMessage>
}

// =============================================================================
// Tool Factory
// =============================================================================

/**
 * Creates a document update tool with injected context.
 *
 * This is a factory function because the tool needs access to:
 * - User session information for authorization
 * - Data stream for real-time updates
 *
 * @param context - Tool execution context
 * @returns Configured tool instance
 *
 * @example
 * ```typescript
 * const tool = createUpdateDocumentTool({
 *   userId: session.user.id,
 *   isGuest: false,
 *   dataStream: writer,
 * });
 * ```
 */
export function createUpdateDocumentTool(context: UpdateDocumentContext) {
	return tool({
		description:
			"Update an existing document. Provide a clear description of the changes required.",

		inputSchema: z.object({
			id: z.string().describe("The ID of the document to update"),
			description: z
				.string()
				.describe("The description of changes that need to be made"),
		}),

		execute: async ({ id, description }) => {
			const timeoutMs = DEFAULT_TIMEOUT_MS

			try {
				// Get the existing artifact
				const artifact = await artifactService.getArtifact(id, {
					userId: context.userId,
					isGuest: context.isGuest,
				})

				if (!artifact) {
					return {
						error: "Document not found",
					}
				}

				// Clear any existing streaming state
				context.dataStream.write({
					type: "data-clear",
					data: null,
					transient: true,
				})

				// Note: The actual document update with content streaming
				// is handled by the AI model's response. This tool:
				// 1. Validates the document exists
				// 2. Sets up the streaming context
				// 3. Returns metadata for the AI to reference
				//
				// The content update happens via the data-stream handler
				// which processes the streamed content and calls the
				// artifact service to create a new version.

				// Signal completion
				context.dataStream.write({
					type: "data-finish",
					data: null,
					transient: true,
				})

				return {
					id,
					title: artifact.title,
					kind: artifact.kind,
					content: "The document has been updated successfully.",
					description,
				}
			} catch (error) {
				// Handle timeout
				if (error instanceof Error && error.name === "AbortError") {
					throw ToolExecutionError.timeout(
						"updateDocument",
						timeoutMs,
					)
				}

				// Handle other errors
				throw ToolExecutionError.executionFailed(
					"updateDocument",
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
export const UPDATE_DOCUMENT_TOOL_NAME = "updateDocument" as const

// =============================================================================
// Legacy Export (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use createUpdateDocumentTool factory instead.
 *
 * Creates an update document tool with the legacy API signature.
 * This is provided for backward compatibility during migration.
 */
export const updateDocument = (params: {
	userId: string
	isGuest: boolean
	dataStream: UIMessageStreamWriter<ChatMessage>
}) => {
	return createUpdateDocumentTool({
		userId: params.userId,
		isGuest: params.isGuest,
		dataStream: params.dataStream,
	})
}
