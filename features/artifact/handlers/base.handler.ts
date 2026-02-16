/**
 * Base Artifact Handler
 *
 * Abstract base class for artifact handlers that process AI streaming
 * for different artifact types (text, code, image, sheet).
 *
 * @module features/artifact/handlers/base.handler
 */

import type { UIMessage, UIMessageStreamWriter } from "ai"
import type { ArtifactKind } from "../types"

/**
 * Context passed to create document handler
 */
export interface CreateDocumentContext {
	/** Unique document identifier */
	id: string
	/** Document title/prompt for generation */
	title: string
	/** Stream writer for sending real-time updates to client */
	dataStream: UIMessageStreamWriter<UIMessage>
	/** User session user ID */
	userId: string
	/** Associated chat ID */
	chatId: string
}

/**
 * Context passed to update document handler
 */
export interface UpdateDocumentContext {
	/** Current document content */
	document: {
		id: string
		title: string
		content: string
		kind: ArtifactKind
		chatId: string
	}
	/** Description of the requested changes */
	description: string
	/** Stream writer for sending real-time updates to client */
	dataStream: UIMessageStreamWriter<UIMessage>
	/** User session user ID */
	userId: string
}

/**
 * Configuration for creating an artifact handler
 */
export interface ArtifactHandlerConfig<T extends ArtifactKind> {
	/** The artifact kind this handler processes */
	kind: T
	/**
	 * Handler for creating new artifact content
	 * @param context - Create context with title and stream
	 * @returns The final generated content
	 */
	onCreateDocument: (context: CreateDocumentContext) => Promise<string>
	/**
	 * Handler for updating existing artifact content
	 * @param context - Update context with document and description
	 * @returns The final updated content
	 */
	onUpdateDocument: (context: UpdateDocumentContext) => Promise<string>
}

/**
 * Artifact handler interface
 * Defines the contract for type-specific artifact handlers
 */
export interface ArtifactHandler<T extends ArtifactKind = ArtifactKind> {
	/** The artifact kind this handler processes */
	readonly kind: T
	/**
	 * Create a new artifact with AI-generated content
	 * @param context - Create context
	 */
	createDocument(context: CreateDocumentContext): Promise<void>
	/**
	 * Update an existing artifact with AI-modified content
	 * @param context - Update context
	 */
	updateDocument(context: UpdateDocumentContext): Promise<void>
}

/**
 * Abstract base class for artifact handlers
 *
 * Provides the common structure for artifact handlers that process
 * AI streaming operations. Subclasses implement the specific streaming
 * logic for their artifact type.
 *
 * @example
 * ```typescript
 * class TextHandler extends BaseArtifactHandler<"text"> {
 *   constructor() {
 *     super("text")
 *   }
 *
 *   protected async doCreateDocument(context: CreateDocumentContext): Promise<string> {
 *     // Implement text-specific streaming logic
 *   }
 *
 *   protected async doUpdateDocument(context: UpdateDocumentContext): Promise<string> {
 *     // Implement text-specific update logic
 *   }
 * }
 * ```
 */
export abstract class BaseArtifactHandler<T extends ArtifactKind>
	implements ArtifactHandler<T>
{
	readonly kind: T

	constructor(kind: T) {
		this.kind = kind
	}

	/**
	 * Create a new artifact document
	 *
	 * Orchestrates the creation flow:
	 * 1. Generate content via AI streaming
	 * 2. Persist via artifact actions
	 *
	 * @param context - Create context with title and stream
	 */
	async createDocument(context: CreateDocumentContext): Promise<void> {
		const content = await this.doCreateDocument(context)

		// Persist the artifact
		if (context.userId) {
			const { createArtifact } = await import(
				"../actions/create-artifact.action"
			)
			await createArtifact({
				title: context.title,
				content,
				kind: this.kind,
				chatId: context.chatId,
			})
		}
	}

	/**
	 * Update an existing artifact document
	 *
	 * Orchestrates the update flow:
	 * 1. Generate updated content via AI streaming
	 * 2. Persist via artifact actions (creates new version)
	 *
	 * @param context - Update context with document and description
	 */
	async updateDocument(context: UpdateDocumentContext): Promise<void> {
		const content = await this.doUpdateDocument(context)

		// Persist the updated artifact (creates new version)
		if (context.userId) {
			const { updateArtifact } = await import(
				"../actions/update-artifact.action"
			)
			await updateArtifact(context.document.id, {
				content,
				kind: this.kind,
			})
		}
	}

	/**
	 * Implement artifact-specific content creation
	 *
	 * Subclasses must implement this to define how content is generated
	 * for their specific artifact type using AI streaming.
	 *
	 * @param context - Create context
	 * @returns The generated content
	 */
	protected abstract doCreateDocument(
		context: CreateDocumentContext,
	): Promise<string>

	/**
	 * Implement artifact-specific content update
	 *
	 * Subclasses must implement this to define how content is modified
	 * for their specific artifact type using AI streaming.
	 *
	 * @param context - Update context
	 * @returns The updated content
	 */
	protected abstract doUpdateDocument(
		context: UpdateDocumentContext,
	): Promise<string>
}

/**
 * Factory function to create an artifact handler
 *
 * Provides a simpler functional API for creating handlers when
 * the class-based approach isn't needed.
 *
 * @param config - Handler configuration
 * @returns An artifact handler instance
 *
 * @example
 * ```typescript
 * export const textHandler = createArtifactHandler({
 *   kind: "text",
 *   onCreateDocument: async (context) => {
 *     // Generate and return text content
 *   },
 *   onUpdateDocument: async (context) => {
 *     // Update and return text content
 *   },
 * })
 * ```
 */
export function createArtifactHandler<T extends ArtifactKind>(
	config: ArtifactHandlerConfig<T>,
): ArtifactHandler<T> {
	return {
		kind: config.kind,
		async createDocument(context: CreateDocumentContext): Promise<void> {
			const content = await config.onCreateDocument(context)

			if (context.userId) {
				const { createArtifact } = await import(
					"../actions/create-artifact.action"
				)
				await createArtifact({
					title: context.title,
					content,
					kind: config.kind,
					chatId: context.chatId,
				})
			}
		},
		async updateDocument(context: UpdateDocumentContext): Promise<void> {
			const content = await config.onUpdateDocument(context)

			if (context.userId) {
				const { updateArtifact } = await import(
					"../actions/update-artifact.action"
				)
				await updateArtifact(context.document.id, {
					content,
					kind: config.kind,
				})
			}
		},
	}
}
