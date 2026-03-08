import { streamObject, tool } from "ai"
import { z } from "zod"

import { getInternalLanguageModel } from "@/lib/ai/internal-models"
import { getArtifactById } from "@/lib/data/artifact"
import { saveSuggestions } from "@/lib/data/suggestion"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactSuggestion } from "@/lib/types/artifact.types"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { NewSuggestion } from "@/lib/types/entity.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

// ── Types ────────────────────────────────────────────────────

type RequestSuggestionsToolParams = {
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}

type SuggestionPosition = Pick<
	ArtifactSuggestion,
	"occurrenceIndex" | "selectionStart" | "selectionEnd"
>

type TextPosition = {
	start: number
	end: number
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
	occurrenceIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe(
			"When originalText appears multiple times in the artifact, the zero-based occurrence index of the exact passage to replace.",
		),
})

function findTextPositions(content: string, searchText: string): TextPosition[] {
	if (searchText.length === 0) {
		return []
	}

	const positions: TextPosition[] = []
	let searchStart = 0

	while (searchStart <= content.length - searchText.length) {
		const index = content.indexOf(searchText, searchStart)
		if (index === -1) {
			break
		}

		positions.push({
			start: index,
			end: index + searchText.length,
		})
		searchStart = index + searchText.length
	}

	return positions
}

function resolveSuggestionPosition(
	content: string,
	originalText: string,
	occurrenceIndex?: number,
): SuggestionPosition {
	const positions = findTextPositions(content, originalText)
	if (positions.length === 0) {
		return {}
	}

	if (typeof occurrenceIndex === "number") {
		const explicitPosition = positions[occurrenceIndex]
		if (!explicitPosition) {
			return {}
		}

		return {
			occurrenceIndex,
			selectionStart: explicitPosition.start,
			selectionEnd: explicitPosition.end,
		}
	}

	if (positions.length === 1) {
		const [position] = positions
		if (!position) {
			return {}
		}

		return {
			occurrenceIndex: 0,
			selectionStart: position.start,
			selectionEnd: position.end,
		}
	}

	return {}
}

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

			if (artifact.userId !== session.userId) {
				throw AppError.forbidden(
					"forbidden:artifact:owner_mismatch",
					"Not authorized to access this artifact",
				)
			}

			const suggestions: ArtifactSuggestion[] = []

			const { elementStream } = streamObject({
				model: getInternalLanguageModel("artifact"),
				system: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Each suggestion should identify an exact passage in the original text and offer a concrete replacement. Ensure suggestions are complete sentences and clearly describe the change. If originalText appears multiple times in the artifact, include occurrenceIndex as the zero-based occurrence to replace.",
				prompt: artifact.content,
				output: "array",
				schema: suggestionElementSchema,
			})

			for await (const element of elementStream) {
				const suggestionPosition = resolveSuggestionPosition(
					artifact.content,
					element.originalText,
					element.occurrenceIndex,
				)

				const suggestion: ArtifactSuggestion = {
					originalText: element.originalText,
					suggestedText: element.suggestedText,
					description: element.description,
					...suggestionPosition,
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
