import type {
	LanguageModelV3,
	LanguageModelV3StreamPart,
	LanguageModelV3Usage,
} from "@ai-sdk/provider"
import type { UIMessage } from "ai"
import { simulateReadableStream, tool } from "ai"
import { MockLanguageModelV3 } from "ai/test"
import { z } from "zod"

import {
	createDeferredArtifactClearWriter,
	writeArtifactCreatePrelude,
	writeArtifactFinish,
} from "@/features/chat/lib/tools/artifact-tool-utils"
import { getArtifactById, saveArtifactVersion } from "@/lib/data/artifact"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactKind, ArtifactSuggestion } from "@/lib/types/artifact.types"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

const DEFAULT_USAGE: LanguageModelV3Usage = {
	inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
	outputTokens: { total: 20, text: undefined, reasoning: undefined },
}

const createArtifactSchema = z.object({
	title: z.string(),
	kind: z.enum(["text", "code", "image", "sheet"]),
})

const updateArtifactSchema = z.object({
	id: z.string(),
	description: z.string(),
})

const requestSuggestionsSchema = z.object({
	artifactId: z.string(),
})

function getQuotedTitle(prompt: string): string | null {
	const singleQuoted = prompt.match(/titled\s+'([^']+)'/i)
	if (singleQuoted?.[1]) {
		return singleQuoted[1]
	}

	const doubleQuoted = prompt.match(/titled\s+"([^"]+)"/i)
	return doubleQuoted?.[1] ?? null
}

function getArtifactKind(prompt: string): ArtifactKind {
	if (/image artifact|broken image|svg|data url/i.test(prompt)) {
		return "image"
	}

	if (/sheet artifact|csv|spreadsheet/i.test(prompt)) {
		return "sheet"
	}

	if (/code artifact|python|\.py\b/i.test(prompt)) {
		return "code"
	}

	return "text"
}

function buildTextArtifactContent(title: string, description: string): string {
	const topic = description.replace(/\s+/g, " ").trim()

	return [
		title,
		"",
		`Prompt: ${topic}`,
		"",
		"1. This artifact is generated from the scoped e2e artifact fixture.",
		"2. It intentionally uses stable multi-line content for reliable UI assertions.",
		"3. The artifact panel should open as soon as the artifact stream begins.",
		"4. The content is long enough to satisfy the product artifact guidance.",
		"5. The chat route still streams real artifact deltas into the UI store.",
		"6. The saved artifact version is persisted through the normal data layer.",
		"7. This keeps the Playwright lane independent from live model quota.",
		"8. It also avoids provider-side prompt variance during regression runs.",
		"9. The content remains deterministic across local and CI executions.",
		"10. Users can still close, reopen, and version the artifact normally.",
		"11. Follow-up update prompts will create another saved version.",
		"12. This final line guarantees a visible multi-line artifact body.",
	].join("\n")
}

function buildCodeArtifactContent(_title: string, description: string): string {
	const comment = description.replace(/\s+/g, " ").trim()

	return [
		`# ${comment}`,
		"def fibonacci(n: int) -> int:",
		"    if n < 2:",
		"        return n",
		"    return fibonacci(n - 1) + fibonacci(n - 2)",
		"",
		"values = [fibonacci(index) for index in range(8)]",
		"for index, value in enumerate(values):",
		'    print(f"F({index}) = {value}")',
	].join("\n")
}

function buildSheetArtifactContent(title: string, description: string): string {
	return [
		"title,description,status",
		`"${title}","${description.replace(/"/g, "'")}","ready"`,
		"Artifact Fixture,Deterministic sheet content for Playwright,ready",
	].join("\n")
}

function buildImageArtifactContent(title: string): string {
	if (/broken/i.test(title)) {
		return "/e2e-artifact-fixture-missing-image.png"
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#0f172a"/><circle cx="170" cy="180" r="86" fill="#38bdf8"/><rect x="280" y="104" width="260" height="152" rx="28" fill="#f8fafc"/><text x="320" y="190" font-family="Arial, sans-serif" font-size="30" fill="#0f172a">${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text></svg>`

	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function buildArtifactContent(kind: ArtifactKind, title: string, description: string): string {
	switch (kind) {
		case "code":
			return buildCodeArtifactContent(title, description)
		case "image":
			return buildImageArtifactContent(title)
		case "sheet":
			return buildSheetArtifactContent(title, description)
		default:
			return buildTextArtifactContent(title, description)
	}
}

function getArtifactDeltaType(kind: ArtifactKind) {
	switch (kind) {
		case "code":
			return "artifact-codeDelta"
		case "image":
			return "artifact-imageDelta"
		case "sheet":
			return "artifact-sheetDelta"
		default:
			return "artifact-textDelta"
	}
}

function createMockToolCallModel(config: {
	toolName: "createArtifact" | "requestSuggestions" | "updateArtifact"
	args: Record<string, unknown>
	followUpText: string
}): LanguageModelV3 {
	const toolCallId = `call-${crypto.randomUUID().slice(0, 8)}`
	const argsJson = JSON.stringify(config.args)
	let callCount = 0

	return new MockLanguageModelV3({
		doGenerate: async () => {
			callCount += 1
			if (callCount === 1) {
				return {
					finishReason: { unified: "tool-calls" as const, raw: undefined },
					usage: DEFAULT_USAGE,
					content: [
						{
							type: "tool-call" as const,
							toolCallId,
							toolName: config.toolName,
							input: argsJson,
						},
					],
					warnings: [],
				}
			}

			return {
				finishReason: { unified: "stop" as const, raw: undefined },
				usage: DEFAULT_USAGE,
				content: [{ type: "text" as const, text: config.followUpText }],
				warnings: [],
			}
		},
		doStream: async () => {
			callCount += 1
			if (callCount === 1) {
				return {
					stream: simulateReadableStream({
						chunks: [
							{
								type: "tool-input-start",
								id: toolCallId,
								toolName: config.toolName,
							},
							{ type: "tool-input-delta", id: toolCallId, delta: argsJson },
							{ type: "tool-input-end", id: toolCallId },
							{
								type: "tool-call",
								toolCallId,
								toolName: config.toolName,
								input: argsJson,
							},
							{
								type: "finish",
								finishReason: { unified: "tool-calls", raw: undefined },
								usage: DEFAULT_USAGE,
							},
						] satisfies LanguageModelV3StreamPart[],
						initialDelayInMs: null,
						chunkDelayInMs: null,
					}),
				}
			}

			return {
				stream: simulateReadableStream({
					chunks: [
						{ type: "text-start", id: "text-0" },
						{ type: "text-delta", id: "text-0", delta: config.followUpText },
						{ type: "text-end", id: "text-0" },
						{
							type: "finish",
							finishReason: { unified: "stop", raw: undefined },
							usage: DEFAULT_USAGE,
						},
					] satisfies LanguageModelV3StreamPart[],
					initialDelayInMs: null,
					chunkDelayInMs: null,
				}),
			}
		},
	})
}

export async function createArtifactFixtureModel({
	prompt,
	artifactId,
}: {
	prompt: string
	artifactId?: string
}): Promise<LanguageModelV3> {
	if (
		/request suggestions|generate suggestions|suggestions for the current artifact/i.test(
			prompt,
		) &&
		artifactId
	) {
		return createMockToolCallModel({
			toolName: "requestSuggestions",
			args: { artifactId },
			followUpText: "Suggestions generated.",
		})
	}

	if (
		/update the current artifact|update artifact|rewrite the artifact/i.test(prompt) &&
		artifactId
	) {
		return createMockToolCallModel({
			toolName: "updateArtifact",
			args: {
				id: artifactId,
				description: prompt,
			},
			followUpText: "I've updated the artifact in the panel.",
		})
	}

	const kind = getArtifactKind(prompt)
	const title = getQuotedTitle(prompt) ?? `${kind === "code" ? "Code" : "Text"} Artifact`

	return createMockToolCallModel({
		toolName: "createArtifact",
		args: { title, kind },
		followUpText: "I've created the artifact in the panel.",
	})
}

function buildArtifactFixtureSuggestions(content: string): ArtifactSuggestion[] {
	const originalText = "This artifact is generated from the scoped e2e artifact fixture."
	const selectionStart = content.indexOf(originalText)

	return [
		{
			originalText,
			suggestedText:
				"This artifact is generated by the scoped e2e artifact fixture with inline suggestions.",
			description: "Clarify that the fixture stream renders inline suggestions.",
			occurrenceIndex: 0,
			...(selectionStart >= 0
				? { selectionStart, selectionEnd: selectionStart + originalText.length }
				: {}),
		},
	]
}

export function buildArtifactFixtureTools({
	chatId,
	session,
	chatStream,
}: {
	chatId: string
	session: { userId: string; isGuest: boolean }
	chatStream: ArtifactStreamWriter
}) {
	return {
		createArtifact: tool({
			description:
				"Deterministic artifact fixture tool used only by the artifact Playwright lane.",
			inputSchema: createArtifactSchema,
			execute: async ({ title, kind }) => {
				const id = generateUUID()
				const content = buildArtifactContent(kind, title, title)

				writeArtifactCreatePrelude(chatStream, { id, title, kind })
				chatStream.writeData({
					type: getArtifactDeltaType(kind),
					content,
				})

				await saveArtifactVersion({
					id,
					title,
					content,
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
		}),
		updateArtifact: tool({
			description:
				"Deterministic artifact fixture update tool used only by the artifact Playwright lane.",
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

				const updatedContent = buildArtifactContent(
					artifact.kind,
					artifact.title,
					description,
				)
				const updateStream = createDeferredArtifactClearWriter(chatStream)
				updateStream.writeData({
					type: getArtifactDeltaType(artifact.kind),
					content: updatedContent,
				})

				await saveArtifactVersion({
					id,
					title: artifact.title,
					content: updatedContent,
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
		}),
		requestSuggestions: tool({
			description:
				"Deterministic artifact fixture suggestion tool used only by the artifact Playwright lane.",
			inputSchema: requestSuggestionsSchema,
			execute: async ({ artifactId }) => {
				const artifact = await getArtifactById(artifactId)

				if (!artifact?.content) {
					return { error: "Artifact not found or has no content" }
				}

				if (artifact.userId !== session.userId) {
					throw AppError.forbidden(
						"forbidden:artifact:owner_mismatch",
						"Not authorized to access this artifact",
					)
				}

				const suggestions = buildArtifactFixtureSuggestions(artifact.content)

				for (const suggestion of suggestions) {
					chatStream.writeData({
						type: "artifact-suggestion",
						content: suggestion,
					})
				}

				if (!session.isGuest) {
					const { saveSuggestions } = await import("@/lib/data/suggestion")

					await saveSuggestions(
						suggestions.map((suggestion) => ({
							id: generateUUID(),
							artifactId,
							artifactCreatedAt: artifact.createdAt,
							originalText: suggestion.originalText,
							suggestedText: suggestion.suggestedText,
							description: suggestion.description,
							isResolved: false,
							userId: session.userId,
							createdAt: new Date(),
						})),
					)
				}

				return {
					id: artifactId,
					title: artifact.title,
					kind: artifact.kind,
					message: "Suggestions generated.",
				}
			},
		}),
	}
}

export function toPersistedArtifactFixtureMessages(responseMessages: UIMessage[]): UIMessage[] {
	const latestAssistantText =
		responseMessages
			.flatMap((message) => message.parts ?? [])
			.filter(
				(part): part is { type: "text"; text: string } =>
					part.type === "text" && typeof part.text === "string",
			)
			.map((part) => part.text.trim())
			.find((text) => text.length > 0) ?? "I've updated the artifact in the panel."

	return [
		{
			id: generateUUID(),
			role: "assistant",
			parts: [{ type: "text", text: latestAssistantText }],
		},
	]
}
