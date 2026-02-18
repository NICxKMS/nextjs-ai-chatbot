/**
 * Text Artifact Handler
 *
 * Handler for text artifact streaming operations using AI SDK streamText.
 * Generates and updates text content with markdown support.
 *
 * @module features/artifact/handlers/text.handler
 */

import { smoothStream, streamText } from "ai"
import { getTextUpdatePrompt, textPrompt } from "@/lib/ai/prompts"
import { getModel } from "@/lib/ai/registry"
import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

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

		const { fullStream } = streamText({
			model: getModel("artifact-model"),
			system: textPrompt,
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

		const { fullStream } = streamText({
			model: getModel("artifact-model"),
			system: getTextUpdatePrompt(document.content),
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
