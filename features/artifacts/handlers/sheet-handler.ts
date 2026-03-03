import { streamObject } from "ai"
import { z } from "zod"
import { getUpdateArtifactPrompt, SHEET_PROMPT } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"
import { ARTIFACT_MODEL } from "@/lib/types/model.types"

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
		let draftContent = ""

		const { fullStream } = streamObject({
			model: myProvider.languageModel(ARTIFACT_MODEL),
			system: SHEET_PROMPT,
			prompt: title,
			schema: csvSchema,
		})

		for await (const delta of fullStream) {
			if (delta.type === "object") {
				const csv = delta.object.csv
				if (csv) {
					chatStream.writeData({
						type: "artifact-sheetDelta",
						content: csv,
					})
					draftContent = csv
				}
			}
		}

		return draftContent
	},

	async update(params: UpdateArtifactParams): Promise<string> {
		const { currentContent, description, kind, chatStream } = params
		let draftContent = ""

		const { fullStream } = streamObject({
			model: myProvider.languageModel(ARTIFACT_MODEL),
			system: getUpdateArtifactPrompt(currentContent, kind),
			prompt: description,
			schema: csvSchema,
		})

		for await (const delta of fullStream) {
			if (delta.type === "object") {
				const csv = delta.object.csv
				if (csv) {
					chatStream.writeData({
						type: "artifact-sheetDelta",
						content: csv,
					})
					draftContent = csv
				}
			}
		}

		return draftContent
	},
}
