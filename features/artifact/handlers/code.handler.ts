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
import { type ArtifactHandler, createArtifactHandler } from "./base.handler"

/**
 * Zod schema for code artifact output
 */
const codeSchema = z.object({
	code: z.string(),
})

/**
 * System prompt for code artifact creation
 */
const CODE_CREATE_SYSTEM_PROMPT = `Generate self-contained, executable Python code.

Requirements:
- Write clean, well-documented Python code
- Include necessary imports at the top
- Add docstrings to functions and classes
- Handle edge cases and errors appropriately
- Follow PEP 8 style guidelines`

/**
 * Generate system prompt for code artifact updates
 * @param currentContent - The current code content
 * @returns System prompt for the update operation
 */
function getUpdateSystemPrompt(currentContent: string | null): string {
	return `You are a helpful assistant that helps update Python code.

Current code:
\`\`\`python
${currentContent ?? "# Empty file"}
\`\`\`

Please update the code based on the user's request. Maintain the overall structure and style unless specifically asked to change it.`
}

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

		// TODO: Replace with actual provider from lib/ai/providers when available
		const { fullStream } = streamObject({
			model: "artifact-model",
			system: CODE_CREATE_SYSTEM_PROMPT,
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

		// TODO: Replace with actual provider from lib/ai/providers when available
		const { fullStream } = streamObject({
			model: "artifact-model",
			system: getUpdateSystemPrompt(document.content),
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
