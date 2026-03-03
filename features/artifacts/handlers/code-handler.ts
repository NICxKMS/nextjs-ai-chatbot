import { streamObject } from "ai"
import { z } from "zod"
import { CODE_PROMPT, getUpdateArtifactPrompt } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"
import { ARTIFACT_MODEL } from "@/lib/types/model.types"

// ── Code output schema ───────────────────────────────────────
// streamObject() parses the model output into this shape.

const codeSchema = z.object({
	code: z.string(),
})

// ── Code artifact handler ────────────────────────────────────
// Streams `artifact-codeDelta` parts with REPLACE semantics.
// Each delta contains the full code so far (partial object).
// The calling tool owns lifecycle (preamble, persistence, postamble).

export const codeHandler: ArtifactHandler = {
	async create({ title, chatStream }: CreateArtifactParams): Promise<string> {
		let content = ""

		const { fullStream } = streamObject({
			model: myProvider.languageModel(ARTIFACT_MODEL),
			system: CODE_PROMPT,
			prompt: title,
			schema: codeSchema,
		})

		for await (const part of fullStream) {
			if (part.type === "object") {
				const { code } = part.object

				if (code) {
					chatStream.writeData({
						type: "artifact-codeDelta",
						content: code,
					})

					content = code
				}
			}
		}

		return content
	},

	async update({
		currentContent,
		description,
		chatStream,
	}: UpdateArtifactParams): Promise<string> {
		let content = ""

		const { fullStream } = streamObject({
			model: myProvider.languageModel(ARTIFACT_MODEL),
			system: getUpdateArtifactPrompt(currentContent, "code"),
			prompt: description,
			schema: codeSchema,
		})

		for await (const part of fullStream) {
			if (part.type === "object") {
				const { code } = part.object

				if (code) {
					chatStream.writeData({
						type: "artifact-codeDelta",
						content: code,
					})

					content = code
				}
			}
		}

		return content
	},
}
