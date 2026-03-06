import { streamObject } from "ai"
import { z } from "zod"
import { getInternalLanguageModel } from "@/lib/ai/internal-models"
import { CODE_PROMPT, getUpdateArtifactPrompt } from "@/lib/ai/prompts"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

import { collectReplacingObjectStream } from "./stream-artifact-deltas"

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
		const { fullStream } = streamObject({
			model: getInternalLanguageModel("artifact"),
			system: CODE_PROMPT,
			prompt: title,
			schema: codeSchema,
		})

		return collectReplacingObjectStream({
			fullStream,
			chatStream,
			eventType: "artifact-codeDelta",
			pickContent: (object) => object?.code,
		})
	},

	async update({
		currentContent,
		description,
		chatStream,
	}: UpdateArtifactParams): Promise<string> {
		const { fullStream } = streamObject({
			model: getInternalLanguageModel("artifact"),
			system: getUpdateArtifactPrompt(currentContent, "code"),
			prompt: description,
			schema: codeSchema,
		})

		return collectReplacingObjectStream({
			fullStream,
			chatStream,
			eventType: "artifact-codeDelta",
			pickContent: (object) => object?.code,
		})
	},
}
