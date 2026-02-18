/**
 * Create Document Tool
 *
 * AI tool for creating new documents/artifacts via the chat interface.
 * Integrates with the artifact service for persistence and delegates
 * to artifact handlers for AI content generation.
 *
 * @module features/chat/lib/tools/create-document.tool
 */

import { tool, type UIMessageStreamWriter } from "ai"
import { z } from "zod"
import { getArtifactHandler } from "@/features/artifact/handlers"
import type { ArtifactKind } from "@/features/artifact/types"
import type { ChatMessage } from "@/features/chat/types"
import { ToolExecutionError } from "./errors"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default timeout for document creation (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000

// =============================================================================
// Types
// =============================================================================

/**
 * Context required for document creation tool
 */
export interface CreateDocumentContext {
	/** User session ID */
	userId: string
	/** Whether the user is a guest */
	isGuest: boolean
	/** Chat ID for associating the document */
	chatId: string
	/** Data stream writer for sending updates to client */
	dataStream: UIMessageStreamWriter<ChatMessage>
}

/**
 * Supported artifact kinds for document creation
 * Must be a tuple for zod enum
 */
const ARTIFACT_KINDS = ["text", "code", "image", "sheet"] as const

// =============================================================================
// Tool Factory
// =============================================================================

/**
 * Creates a document creation tool with injected context.
 *
 * This is a factory function because the tool needs access to:
 * - User session information
 * - Chat ID for document association
 * - Data stream for real-time updates
 *
 * @param context - Tool execution context
 * @returns Configured tool instance
 *
 * @example
 * ```typescript
 * const tool = createDocumentTool({
 *   userId: session.user.id,
 *   isGuest: false,
 *   chatId: 'chat-123',
 *   dataStream: writer,
 * });
 * ```
 */
export function createCreateDocumentTool(context: CreateDocumentContext) {
	return tool({
		description:
			"Create a new document, code snippet, or spreadsheet. Use for substantial content (>10 lines) or when the user explicitly requests a separate artifact.",

		inputSchema: z.object({
			title: z.string().describe("Title for the document"),
			kind: z.enum(ARTIFACT_KINDS).describe("Type of document to create"),
		}),

		execute: async ({ title, kind }) => {
			const timeoutMs = DEFAULT_TIMEOUT_MS
			const documentId = crypto.randomUUID()

			try {
				// Stream document metadata to client
				context.dataStream.write({
					type: "data-kind",
					data: kind,
					transient: true,
				})

				context.dataStream.write({
					type: "data-id",
					data: documentId,
					transient: true,
				})

				context.dataStream.write({
					type: "data-title",
					data: title,
					transient: true,
				})

				context.dataStream.write({
					type: "data-clear",
					data: null,
					transient: true,
				})

				// Get the appropriate handler for this artifact kind
				// and delegate content generation to it
				const documentHandler = getArtifactHandler(kind as ArtifactKind)

				await documentHandler.createDocument({
					id: documentId,
					title,
					dataStream: context.dataStream,
					userId: context.userId,
					chatId: context.chatId,
				})

				// Signal completion
				context.dataStream.write({
					type: "data-finish",
					data: null,
					transient: true,
				})

				return {
					id: documentId,
					title,
					kind,
					content:
						"A document was created and is now visible to the user.",
				}
			} catch (error) {
				// Handle timeout
				if (error instanceof Error && error.name === "AbortError") {
					throw ToolExecutionError.timeout(
						"createDocument",
						timeoutMs,
					)
				}

				// Handle other errors
				throw ToolExecutionError.executionFailed(
					"createDocument",
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
export const CREATE_DOCUMENT_TOOL_NAME = "createDocument" as const

// =============================================================================
// Legacy Export (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use createCreateDocumentTool factory instead.
 *
 * Creates a document tool with the legacy API signature.
 * This is provided for backward compatibility during migration.
 */
export const createDocument = (params: {
	userId: string
	isGuest: boolean
	chatId: string
	dataStream: UIMessageStreamWriter<ChatMessage>
}) => {
	return createCreateDocumentTool({
		userId: params.userId,
		isGuest: params.isGuest,
		chatId: params.chatId,
		dataStream: params.dataStream,
	})
}
