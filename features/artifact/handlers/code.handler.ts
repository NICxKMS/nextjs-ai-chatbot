/**
 * Code Artifact Handler
 *
 * Handler for code artifact streaming operations using AI SDK streamObject.
 * Generates and updates Python code with structured output.
 *
 * @module features/artifact/handlers/code.handler
 */

import { streamObject } from "ai"
import { z } from "zod"
import { codePrompt, getCodeUpdatePrompt } from "@/lib/ai/prompts"
import { getModel } from "@/lib/ai/registry"
import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

/**
 * Zod schema for code artifact output
 */
const codeSchema = z.object({
	code: z.string(),
})

/**
 * Code artifact handler
 *
 * Handles streaming code generation for code artifacts using the AI SDK.
 * Uses streamObject for structured output with Zod schema validation.
 *
 * Streaming behavior:
 * - Uses streamObject for structured code output
 * - Writes code-delta events to the data stream
 * - Provides incremental code updates during streaming
 *
 * @example
 * ```typescript
 * await codeHandler.createDocument({
 *   id: 'doc-123',
 *   title: 'Create a function to sort a list',
 *   dataStream,
 *   userId: 'user-456',
 *   chatId: 'chat-789',
 * });
 * ```
 */
export const codeHandler: ArtifactHandler<"code"> = createArtifactHandler({
	kind: "code",

	async onCreateDocument({ title, dataStream }) {
		let draftContent = ""

		const { fullStream } = streamObject({
			model: getModel("artifact-model"),
			system: codePrompt,
			prompt: title,
			schema: codeSchema,
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-code-create",
				recordInputs: true,
				recordOutputs: true,
			},
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "object") {
				const { object } = delta
				const { code } = object

				if (code) {
					dataStream.write({
						type: "data-codeDelta",
						data: code ?? "",
						transient: true,
					})

					draftContent = code
				}
			}
		}

		return draftContent
	},

	async onUpdateDocument({ document, description, dataStream }) {
		let draftContent = ""

		const { fullStream } = streamObject({
			model: getModel("artifact-model"),
			system: getCodeUpdatePrompt(document.content),
			prompt: description,
			schema: codeSchema,
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-code-update",
				recordInputs: true,
				recordOutputs: true,
			},
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "object") {
				const { object } = delta
				const { code } = object

				if (code) {
					dataStream.write({
						type: "data-codeDelta",
						data: code ?? "",
						transient: true,
					})

					draftContent = code
				}
			}
		}

		return draftContent
	},
})
