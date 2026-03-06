import { tool } from "ai"
import { z } from "zod"

import {
	ensureArtifactContent,
	writeArtifactCreatePrelude,
	writeArtifactFinish,
} from "@/features/chat/lib/tools/artifact-tool-utils"
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

			writeArtifactCreatePrelude(chatStream, { id, title, kind })

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
			const persistedContent = ensureArtifactContent(content, "create")

			// Persist artifact version to database
			await saveArtifactVersion({
				id,
				title,
				content: persistedContent,
				kind,
				userId: session.userId,
				chatId,
			})

			writeArtifactFinish(chatStream)

			return {
				id,
				title,
				kind,
				content: `Created artifact: "${title}"`,
			}
		},
	})
