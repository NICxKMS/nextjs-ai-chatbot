import { tool } from "ai"
import { z } from "zod"

import {
	createDeferredArtifactClearWriter,
	ensureArtifactContent,
	writeArtifactFinish,
} from "@/features/chat/lib/tools/artifact-tool-utils"
import { getArtifactHandler } from "@/lib/ai/artifact-handlers"
import { getArtifactById, saveArtifactVersion } from "@/lib/data/artifact"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"

// ── Types ────────────────────────────────────────────────────

type UpdateArtifactToolParams = {
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}

// ── Schema ───────────────────────────────────────────────────
// Uses **id** (NOT artifactId) per contracts (AI-W1-01).

const updateArtifactSchema = z.object({
	id: z.string().describe("The ID of the artifact to update"),
	description: z.string().describe("A clear description of the changes to make"),
})

// ── Tool factory ─────────────────────────────────────────────
// Stub implementation for P3 — full handler integration completes in P4.
// The schema and wiring are production-ready; only the execute body
// will gain full handler dispatch once artifact handlers are registered.

export const updateArtifactTool = ({ session, chatStream }: UpdateArtifactToolParams) =>
	tool({
		description:
			"Update an existing artifact with the specified changes. Provide a clear description of the modifications required.",
		inputSchema: updateArtifactSchema,
		execute: async ({ id, description }) => {
			const artifact = await getArtifactById(id)

			if (!artifact) {
				return { error: "Artifact not found" }
			}

			if (artifact.userId !== session.userId) {
				throw AppError.forbidden(
					"forbidden:artifact:owner_mismatch",
					"Not authorized to modify this artifact",
				)
			}

			const updateStream = createDeferredArtifactClearWriter(chatStream)

			// Delegate update to the registered handler
			const handler = getArtifactHandler(artifact.kind)
			const updatedContent = await handler.update({
				id,
				title: artifact.title,
				kind: artifact.kind,
				currentContent: artifact.content ?? "",
				description,
				session,
				chatStream: updateStream,
			})

			const persistedContent = ensureArtifactContent(updatedContent, "update")

			// Persist new artifact version
			await saveArtifactVersion({
				id,
				title: artifact.title,
				content: persistedContent,
				kind: artifact.kind,
				userId: session.userId,
				chatId: artifact.chatId,
			})

			writeArtifactFinish(chatStream)

			return {
				id,
				title: artifact.title,
				kind: artifact.kind,
				content: "The artifact has been updated successfully.",
			}
		},
	})
