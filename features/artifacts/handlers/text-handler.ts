import { smoothStream, streamText } from "ai"
import { getInternalLanguageModel } from "@/lib/ai/internal-models"
import { getUpdateArtifactPrompt } from "@/lib/ai/prompts"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"

// ── Text-specific system prompt ──────────────────────────────
// Guides the model to generate Markdown prose without code blocks.

const TEXT_SYSTEM_PROMPT =
	"Write about the given topic. Markdown is supported. Use headings wherever appropriate. Do not wrap the content in code blocks."

// ── Text artifact handler ────────────────────────────────────
// Streams `artifact-textDelta` parts with APPEND semantics.
// The calling tool owns lifecycle (preamble, persistence, postamble).

export const textHandler: ArtifactHandler = {
	async create({ title, chatStream }: CreateArtifactParams): Promise<string> {
		let content = ""

		const { fullStream } = streamText({
			model: getInternalLanguageModel("artifact"),
			system: TEXT_SYSTEM_PROMPT,
			prompt: title,
			experimental_transform: smoothStream({ chunking: "word" }),
		})

		for await (const part of fullStream) {
			if (part.type === "text-delta") {
				content += part.text

				chatStream.writeData({
					type: "artifact-textDelta",
					content: part.text,
				})
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

		const { fullStream } = streamText({
			model: getInternalLanguageModel("artifact"),
			system: getUpdateArtifactPrompt(currentContent, "text"),
			prompt: description,
			experimental_transform: smoothStream({ chunking: "word" }),
		})

		for await (const part of fullStream) {
			if (part.type === "text-delta") {
				content += part.text

				chatStream.writeData({
					type: "artifact-textDelta",
					content: part.text,
				})
			}
		}

		return content
	},
}
