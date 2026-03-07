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
import type { ArtifactKind } from "@/lib/types/artifact.types"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

const DEFAULT_USAGE: LanguageModelV3Usage = {
	inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
	outputTokens: { total: 20, text: undefined, reasoning: undefined },
}

const createArtifactSchema = z.object({
	title: z.string(),
	kind: z.enum(["text", "code", "sheet"]),
})

const updateArtifactSchema = z.object({
	id: z.string(),
	description: z.string(),
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

function buildArtifactContent(kind: ArtifactKind, title: string, description: string): string {
	switch (kind) {
		case "code":
			return buildCodeArtifactContent(title, description)
		case "sheet":
			return buildSheetArtifactContent(title, description)
		default:
			return buildTextArtifactContent(title, description)
	}
}

function createMockToolCallModel(config: {
	toolName: "createArtifact" | "updateArtifact"
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
					type:
						kind === "code"
							? "artifact-codeDelta"
							: kind === "sheet"
								? "artifact-sheetDelta"
								: "artifact-textDelta",
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
					type:
						artifact.kind === "code"
							? "artifact-codeDelta"
							: artifact.kind === "sheet"
								? "artifact-sheetDelta"
								: "artifact-textDelta",
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
