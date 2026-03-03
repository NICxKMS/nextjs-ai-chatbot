import { tool } from "ai"
import { z } from "zod"

import { getArtifactHandler } from "@/lib/ai/artifact-handlers"
import { saveArtifactVersion } from "@/lib/data/artifact"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

// ── Types ────────────────────────────────────────────────────

type CreateArtifactToolParams = {
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
	chatId: string
}

// ── Schema ───────────────────────────────────────────────────
// The tool-level schema uses "text" | "code" | "sheet" — image artifacts
// are not created via the AI tool (they come from code execution).

const createArtifactSchema = z.object({
	title: z.string().describe("The title of the artifact to create"),
	kind: z
		.enum(["text", "code", "sheet"])
		.describe("Type of artifact to create: text, code, or sheet"),
})

// ── Tool factory ─────────────────────────────────────────────
// Factory pattern — session & stream writer are injected by the API route.
// Handler dispatch uses getArtifactHandler (dependency inversion via registry).

export const createArtifactTool = ({ session, chatStream, chatId }: CreateArtifactToolParams) =>
	tool({
		description:
			"Create a new artifact for substantial, self-contained content (>10 lines) or when the user explicitly requests a separate artifact. Use for documents, code snippets, or spreadsheets.",
		inputSchema: createArtifactSchema,
		execute: async ({ title, kind }) => {
			const id = generateUUID()

			// Signal client to open artifact panel with metadata
			chatStream.writeData({ type: "artifact-kind", content: kind })
			chatStream.writeData({ type: "artifact-id", content: id })
			chatStream.writeData({ type: "artifact-title", content: title })
			chatStream.writeData({ type: "artifact-clear", content: "" })

			// Delegate content generation to the registered handler
			const handler = getArtifactHandler(kind)
			const content = await handler.create({
				id,
				title,
				kind,
				chatId,
				session,
				chatStream,
			})

			// Persist artifact version to database
			await saveArtifactVersion({
				id,
				title,
				content,
				kind,
				userId: session.userId,
				chatId,
			})

			chatStream.writeData({ type: "artifact-finish", content: "" })

			return {
				id,
				title,
				kind,
				content: `Created artifact: "${title}"`,
			}
		},
	})
