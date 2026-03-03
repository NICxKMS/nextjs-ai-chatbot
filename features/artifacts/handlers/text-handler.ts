import { smoothStream, streamText } from "ai"
import { getUpdateArtifactPrompt } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import type {
	ArtifactHandler,
	CreateArtifactParams,
	UpdateArtifactParams,
} from "@/lib/types/artifact-handler.types"
import { ARTIFACT_MODEL } from "@/lib/types/model.types"

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
			model: myProvider.languageModel(ARTIFACT_MODEL),
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
			model: myProvider.languageModel(ARTIFACT_MODEL),
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
