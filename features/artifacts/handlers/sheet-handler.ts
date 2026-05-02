import { streamObject } from "ai"
import { z } from "zod"
import { getInternalLanguageModel } from "@/lib/ai/internal-models"
import { getUpdateArtifactPrompt, SHEET_PROMPT } from "@/lib/ai/prompts"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

import { collectReplacingObjectStream } from "./stream-artifact-deltas"

// ── Schema ───────────────────────────────────────────────────

const csvSchema = z.object({
	csv: z.string().describe("CSV data with headers"),
})

// ── Sheet Artifact Handler ───────────────────────────────────
// Streams `artifact-sheetDelta` parts (REPLACE delta).
// Lifecycle (preamble, persistence, postamble) is owned by the
// calling tool — this handler streams content deltas ONLY.

export const sheetHandler: ArtifactHandler = {
	async create(params: CreateArtifactParams): Promise<string> {
		const { title, chatStream } = params

		const { fullStream } = streamObject({
			model: getInternalLanguageModel("artifact"),
			system: SHEET_PROMPT,
			prompt: title,
			schema: csvSchema,
		})

		return collectReplacingObjectStream({
			fullStream,
			chatStream,
			eventType: "artifact-sheetDelta",
			pickContent: (object) => object?.csv,
		})
	},

	async update(params: UpdateArtifactParams): Promise<string> {
		const { currentContent, description, kind, chatStream } = params

		const { fullStream } = streamObject({
			model: getInternalLanguageModel("artifact"),
			system: getUpdateArtifactPrompt(currentContent, kind),
			prompt: description,
			schema: csvSchema,
		})

		return collectReplacingObjectStream({
			fullStream,
			chatStream,
			eventType: "artifact-sheetDelta",
			pickContent: (object) => object?.csv,
		})
	},
}
