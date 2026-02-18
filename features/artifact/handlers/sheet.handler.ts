/**
 * Sheet Artifact Handler
 *
 * Handler for spreadsheet artifact streaming operations using AI SDK streamObject.
 * Generates and updates CSV data with structured output.
 *
 * @module features/artifact/handlers/sheet.handler
 */

import { streamObject } from "ai"
import { z } from "zod"
import { getSheetUpdatePrompt, sheetPrompt } from "@/lib/ai/prompts"
import { getModel } from "@/lib/ai/registry"
import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

/**
 * Zod schema for sheet artifact output
 */
const sheetSchema = z.object({
	csv: z.string().describe("CSV data"),
})

/**
 * Sheet artifact handler
 *
 * Handles streaming CSV generation for spreadsheet artifacts using the AI SDK.
 * Uses streamObject for structured output with Zod schema validation.
 *
 * Streaming behavior:
 * - Uses streamObject for structured CSV output
 * - Writes sheet-delta events to the data stream
 * - Provides incremental CSV updates during streaming
 *
 * @example
 * ```typescript
 * await sheetHandler.createDocument({
 *   id: 'doc-123',
 *   title: 'Create a budget spreadsheet',
 *   dataStream,
 *   userId: 'user-456',
 *   chatId: 'chat-789',
 * });
 * ```
 */
export const sheetHandler: ArtifactHandler<"sheet"> = createArtifactHandler({
	kind: "sheet",

	async onCreateDocument({ title, dataStream }) {
		let draftContent = ""

		const { fullStream } = streamObject({
			model: getModel("artifact-model"),
			system: sheetPrompt,
			prompt: title,
			schema: sheetSchema,
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-sheet-create",
				recordInputs: true,
				recordOutputs: true,
			},
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "object") {
				const { object } = delta
				const { csv } = object

				if (csv) {
					dataStream.write({
						type: "data-sheetDelta",
						data: csv,
						transient: true,
					})

					draftContent = csv
				}
			}
		}

		// Write final content
		dataStream.write({
			type: "data-sheetDelta",
			data: draftContent,
			transient: true,
		})

		return draftContent
	},

	async onUpdateDocument({ document, description, dataStream }) {
		let draftContent = ""

		const { fullStream } = streamObject({
			model: getModel("artifact-model"),
			system: getSheetUpdatePrompt(document.content),
			prompt: description,
			schema: sheetSchema,
			experimental_telemetry: {
				isEnabled: true,
				functionId: "artifact-sheet-update",
				recordInputs: true,
				recordOutputs: true,
			},
		})

		for await (const delta of fullStream) {
			const { type } = delta

			if (type === "object") {
				const { object } = delta
				const { csv } = object

				if (csv) {
					dataStream.write({
						type: "data-sheetDelta",
						data: csv,
						transient: true,
					})

					draftContent = csv
				}
			}
		}

		return draftContent
	},
})
