import { streamObject, tool } from "ai"
import { z } from "zod"

import { myProvider } from "@/lib/ai/provider"
import { getArtifactById } from "@/lib/data/artifact"
import { saveSuggestions } from "@/lib/data/suggestion"
import type { ArtifactSuggestion } from "@/lib/types/artifact.types"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import { ARTIFACT_MODEL } from "@/lib/types/model.types"
import type { NewSuggestion } from "@/lib/types/models.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

// ── Types ────────────────────────────────────────────────────

type RequestSuggestionsToolParams = {
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}

// ── Schema ───────────────────────────────────────────────────
// Uses **artifactId** (NOT documentId).

const requestSuggestionsSchema = z.object({
	artifactId: z.string().describe("The ID of the artifact to generate suggestions for"),
})

// ── Suggestion element schema ────────────────────────────────
// Schema for each suggestion object streamed from the AI model.

const suggestionElementSchema = z.object({
	originalText: z.string().describe("The original text to be replaced"),
	suggestedText: z.string().describe("The suggested replacement text"),
	description: z.string().describe("A description of why this change is recommended"),
})

// ── Tool factory ─────────────────────────────────────────────
// FULL implementation: fetches artifact, streams suggestions via AI model,
// writes artifact-suggestion data parts, persists for authenticated users.
// Guest users receive streamed suggestions but they are NOT persisted to DB.

export const requestSuggestionsTool = ({ session, chatStream }: RequestSuggestionsToolParams) =>
	tool({
		description:
			"Generate suggestions to improve the current artifact's content. Analyzes the text and provides specific inline edit recommendations.",
		inputSchema: requestSuggestionsSchema,
		execute: async ({ artifactId }) => {
			const artifact = await getArtifactById(artifactId)

			if (!artifact || !artifact.content) {
				return { error: "Artifact not found or has no content" }
			}

			const suggestions: ArtifactSuggestion[] = []

			const { elementStream } = streamObject({
				model: myProvider.languageModel(ARTIFACT_MODEL),
				system: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Each suggestion should identify an exact passage in the original text and offer a concrete replacement. Ensure suggestions are complete sentences and clearly describe the change.",
				prompt: artifact.content,
				output: "array",
				schema: suggestionElementSchema,
			})

			for await (const element of elementStream) {
				const suggestion: ArtifactSuggestion = {
					originalText: element.originalText,
					suggestedText: element.suggestedText,
					description: element.description,
				}

				// Stream suggestion to client in real-time
				chatStream.writeData({
					type: "artifact-suggestion",
					content: suggestion,
				})

				suggestions.push(suggestion)
			}

			// Persist suggestions for authenticated (non-guest) users only
			if (!session.isGuest && suggestions.length > 0) {
				const suggestionsToSave: NewSuggestion[] = suggestions.map((s) => ({
					id: generateUUID(),
					artifactId,
					artifactCreatedAt: artifact.createdAt,
					originalText: s.originalText,
					suggestedText: s.suggestedText,
					description: s.description,
					isResolved: false,
					userId: session.userId,
					createdAt: new Date(),
				}))

				await saveSuggestions(suggestionsToSave)
			}

			return {
				id: artifactId,
				title: artifact.title,
				kind: artifact.kind,
				message: "Suggestions generated.",
			}
		},
	})
