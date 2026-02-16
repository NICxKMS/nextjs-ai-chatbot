/**
 * Text Artifact Handler
 *
 * Handler for text artifact streaming operations using AI SDK streamText.
 * Generates and updates text content with markdown support.
 *
 * @module features/artifact/handlers/text.handler
 */

import { smoothStream, streamText } from "ai"
import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

/**
 * System prompt for text artifact creation
 */
const TEXT_CREATE_SYSTEM_PROMPT =
	"Write about the given topic. Markdown is supported. Use headings wherever appropriate."

/**
 * Generate system prompt for text artifact updates
 * @param currentContent - The current document content
 * @returns System prompt for the update operation
 */
function getUpdateSystemPrompt(currentContent: string | null): string {
	return `You are a helpful assistant that helps update documents.

Current document content:
${currentContent ?? "[Empty document]"}

Please update the document based on the user's request. Maintain the overall structure and style unless specifically asked to change it.`
}

/**
 * Text artifact handler
 *
 * Handles streaming text generation for text artifacts using the AI SDK.
 * Supports markdown formatting and provides smooth word-level streaming.
 *
 * Streaming behavior:
 * - Uses smoothStream with word chunking for natural text flow
 * - Writes text-delta events to the data stream
 * - Supports OpenAI prediction for faster updates
 *
 * @example
 * ```typescript
 * await textHandler.createDocument({
 *   id: 'doc-123',
 *   title: 'Introduction to AI',
 *   dataStream,
 *   userId: 'user-456',
 *   chatId: 'chat-789',
 * });
 * ```
 */
export const textHandler: ArtifactHandler<"text"> = createArtifactHandler({
	kind: "text",

	async onCreateDocument({ title, dataStream }) {
		let draftContent = ""

		// TODO: Replace with actual provider from lib/ai/providers when available
		// For now, using a placeholder that will be replaced during AI module migration
		const { fullStream } = streamText({
			model: "artifact-model",
			system: TEXT_CREATE_SYSTEM_PROMPT,
			experimental_transform: smoothStream({ chunking: "word" }),
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-text-create",
				recordInputs: true,
				recordOutputs: true,
			},
			prompt: title,
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "text-delta") {
				const { text } = delta

				draftContent += text

				dataStream.write({
					type: "data-textDelta",
					data: text,
					transient: true,
				})
			}
		}

		return draftContent
	},

	async onUpdateDocument({ document, description, dataStream }) {
		let draftContent = ""

		// TODO: Replace with actual provider from lib/ai/providers when available
		const { fullStream } = streamText({
			model: "artifact-model",
			system: getUpdateSystemPrompt(document.content),
			experimental_transform: smoothStream({ chunking: "word" }),
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-text-update",
				recordInputs: true,
				recordOutputs: true,
			},
			prompt: description,
			providerOptions: {
				openai: {
					prediction: {
						type: "content",
						content: document.content,
					},
				},
			},
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "text-delta") {
				const { text } = delta

				draftContent += text

				dataStream.write({
					type: "data-textDelta",
					data: text,
					transient: true,
				})
			}
		}

		return draftContent
	},
})
