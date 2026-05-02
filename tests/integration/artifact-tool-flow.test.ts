import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	createDeferredArtifactClearWriter,
	ensureArtifactContent,
} from "@/features/chat/lib/tools/artifact-tool-utils"
import { createArtifactTool } from "@/features/chat/lib/tools/create-artifact"
import { requestSuggestionsTool } from "@/features/chat/lib/tools/request-suggestions"
import { updateArtifactTool } from "@/features/chat/lib/tools/update-artifact"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { Artifact, ArtifactKind } from "@/lib/types/entity.types"

type ExecutableTool<Input, Output> = {
	execute(input: Input): Promise<Output>
}

type StreamObjectOptions = {
	prompt: string
}

const mocks = vi.hoisted(() => ({
	getArtifactHandler: vi.fn(),
	saveArtifactVersion: vi.fn(),
	getArtifactById: vi.fn(),
	saveSuggestions: vi.fn(),
	getInternalLanguageModel: vi.fn(),
	generateUUID: vi.fn(),
	streamObject: vi.fn(),
}))

vi.mock("ai", () => ({
	tool: <T extends object>(definition: T) => definition,
	streamObject: mocks.streamObject,
}))
vi.mock("@/lib/ai/artifact-handlers", () => ({ getArtifactHandler: mocks.getArtifactHandler }))
vi.mock("@/lib/data/artifact", () => ({
	getArtifactById: mocks.getArtifactById,
	saveArtifactVersion: mocks.saveArtifactVersion,
}))
vi.mock("@/lib/data/suggestion", () => ({ saveSuggestions: mocks.saveSuggestions }))
vi.mock("@/lib/ai/internal-models", () => ({
	getInternalLanguageModel: mocks.getInternalLanguageModel,
}))
vi.mock("@/lib/utils/generate-uuid", () => ({ generateUUID: mocks.generateUUID }))

const artifactId = "11111111-1111-4111-8111-111111111111"
const chatId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"
const createdAt = new Date("2026-05-01T00:00:00.000Z")
const session = { userId, isGuest: false }

function streamRecorder() {
	const events: Array<{ type: string; content: unknown }> = []
	const chatStream: ArtifactStreamWriter = {
		writeData(data) {
			events.push(data)
		},
	}
	return { chatStream, events }
}

function artifact(overrides?: Partial<Artifact>): Artifact {
	return {
		id: artifactId,
		createdAt,
		title: "Draft",
		content: "alpha beta alpha",
		kind: "text",
		userId,
		chatId,
		updatedAt: createdAt,
		...overrides,
	}
}

describe("artifact tool integration flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.generateUUID.mockReturnValue("generated-id")
		mocks.getInternalLanguageModel.mockReturnValue("internal-model")
		mocks.saveArtifactVersion.mockResolvedValue(artifact())
		mocks.saveSuggestions.mockResolvedValue([])
		mocks.getArtifactById.mockResolvedValue(artifact())
		mocks.getArtifactHandler.mockReturnValue({
			create: vi.fn().mockResolvedValue("created content"),
			update: vi.fn().mockResolvedValue("updated content"),
		})
		mocks.streamObject.mockReturnValue({
			elementStream: (async function* () {
				yield {
					originalText: "alpha",
					suggestedText: "omega",
					description: "Replace the first alpha",
					occurrenceIndex: 0,
				}
				yield {
					originalText: "beta",
					suggestedText: "delta",
					description: "Replace beta",
				}
			})(),
		})
	})

	it("streams create lifecycle events in order and saves the generated version before finish", async () => {
		const { chatStream, events } = streamRecorder()
		const tool = createArtifactTool({
			session,
			chatStream,
			chatId,
		}) as unknown as ExecutableTool<
			{ title: string; kind: Exclude<ArtifactKind, "image"> },
			{ id: string; title: string; kind: string; content: string }
		>

		const result = await tool.execute({ title: "Draft", kind: "text" })

		expect(events).toEqual([
			{ type: "artifact-kind", content: "text" },
			{ type: "artifact-id", content: "generated-id" },
			{ type: "artifact-title", content: "Draft" },
			{ type: "artifact-clear", content: "" },
			{ type: "artifact-finish", content: "" },
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith({
			id: "generated-id",
			title: "Draft",
			content: "created content",
			kind: "text",
			userId,
			chatId,
		})
		expect(result).toEqual({
			id: "generated-id",
			title: "Draft",
			kind: "text",
			content: 'Created artifact: "Draft"',
		})
	})

	it("throws typed empty-output errors instead of saving blank artifact content", async () => {
		const { chatStream } = streamRecorder()
		mocks.getArtifactHandler.mockReturnValue({ create: vi.fn().mockResolvedValue("   ") })
		const tool = createArtifactTool({
			session,
			chatStream,
			chatId,
		}) as unknown as ExecutableTool<
			{ title: string; kind: Exclude<ArtifactKind, "image"> },
			unknown
		>

		await expect(tool.execute({ title: "Draft", kind: "text" })).rejects.toMatchObject({
			code: "ai_error:artifact:empty_output",
		})
		expect(() => ensureArtifactContent("", "update")).toThrow()
		expect(mocks.saveArtifactVersion).not.toHaveBeenCalled()
	})

	it("reports missing artifacts and forbids owner mismatches before update generation", async () => {
		const { chatStream } = streamRecorder()
		const tool = updateArtifactTool({ session, chatStream }) as unknown as ExecutableTool<
			{ id: string; description: string },
			unknown
		>

		mocks.getArtifactById.mockResolvedValueOnce(null)
		await expect(tool.execute({ id: artifactId, description: "Polish it" })).resolves.toEqual({
			error: "Artifact not found",
		})

		mocks.getArtifactById.mockResolvedValueOnce(artifact({ userId: "other-user" }))
		await expect(
			tool.execute({ id: artifactId, description: "Polish it" }),
		).rejects.toMatchObject({
			code: "forbidden:artifact:owner_mismatch",
		})
		expect(mocks.saveArtifactVersion).not.toHaveBeenCalled()
	})

	it("defers update clears until usable artifact delta content and then saves version plus finish", async () => {
		const { chatStream, events } = streamRecorder()
		mocks.getArtifactHandler.mockReturnValue({
			update: vi.fn(
				async ({ chatStream: updateStream }: { chatStream: ArtifactStreamWriter }) => {
					updateStream.writeData({ type: "artifact-textDelta", content: "  " })
					updateStream.writeData({ type: "artifact-textDelta", content: "updated" })
					return "updated content"
				},
			),
		})
		const tool = updateArtifactTool({ session, chatStream }) as unknown as ExecutableTool<
			{ id: string; description: string },
			unknown
		>

		await tool.execute({ id: artifactId, description: "Polish it" })

		expect(events).toEqual([
			{ type: "artifact-clear", content: "" },
			{ type: "artifact-textDelta", content: "  updated" },
			{ type: "artifact-finish", content: "" },
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith({
			id: artifactId,
			title: "Draft",
			content: "updated content",
			kind: "text",
			userId,
			chatId,
		})
	})

	it.each([
		["code", "artifact-codeDelta", "print('updated')"],
		["sheet", "artifact-sheetDelta", "name,status\nLaunch,updated"],
		["image", "artifact-imageDelta", "data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E"],
	] as const)("uses replace delta semantics when updating %s artifacts", async (kind, deltaType, updatedContent) => {
		const { chatStream, events } = streamRecorder()
		mocks.getArtifactById.mockResolvedValue(artifact({ kind }))
		mocks.getArtifactHandler.mockReturnValue({
			update: vi.fn(
				async ({ chatStream: updateStream }: { chatStream: ArtifactStreamWriter }) => {
					updateStream.writeData({ type: deltaType, content: "old superseded content" })
					updateStream.writeData({ type: deltaType, content: updatedContent })
					return updatedContent
				},
			),
		})
		const tool = updateArtifactTool({ session, chatStream }) as unknown as ExecutableTool<
			{ id: string; description: string },
			unknown
		>

		await tool.execute({ id: artifactId, description: `Update ${kind}` })

		expect(events).toEqual([
			{ type: "artifact-clear", content: "" },
			{ type: deltaType, content: "old superseded content" },
			{ type: deltaType, content: updatedContent },
			{ type: "artifact-finish", content: "" },
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith({
			id: artifactId,
			title: "Draft",
			content: updatedContent,
			kind,
			userId,
			chatId,
		})
	})

	it("streams and persists suggestions for authenticated owners", async () => {
		const { chatStream, events } = streamRecorder()
		const tool = requestSuggestionsTool({ session, chatStream }) as unknown as ExecutableTool<
			{ artifactId: string },
			unknown
		>

		await expect(tool.execute({ artifactId })).resolves.toEqual({
			id: artifactId,
			title: "Draft",
			kind: "text",
			message: "Suggestions generated.",
		})

		expect(mocks.streamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt: "alpha beta alpha",
			}) satisfies Partial<StreamObjectOptions>,
		)
		expect(events).toEqual([
			{
				type: "artifact-suggestion",
				content: {
					originalText: "alpha",
					suggestedText: "omega",
					description: "Replace the first alpha",
					occurrenceIndex: 0,
					selectionStart: 0,
					selectionEnd: 5,
				},
			},
			{
				type: "artifact-suggestion",
				content: {
					originalText: "beta",
					suggestedText: "delta",
					description: "Replace beta",
					occurrenceIndex: 0,
					selectionStart: 6,
					selectionEnd: 10,
				},
			},
		])
		expect(mocks.saveSuggestions).toHaveBeenCalledWith([
			expect.objectContaining({ artifactId, userId, originalText: "alpha" }),
			expect.objectContaining({ artifactId, userId, originalText: "beta" }),
		])
	})

	it("streams guest suggestions without persisting them", async () => {
		const { chatStream } = streamRecorder()
		const tool = requestSuggestionsTool({
			session: { userId, isGuest: true },
			chatStream,
		}) as unknown as ExecutableTool<{ artifactId: string }, unknown>

		await tool.execute({ artifactId })

		expect(mocks.saveSuggestions).not.toHaveBeenCalled()
	})

	it("blocks suggestions for missing payloads and owner mismatches", async () => {
		const { chatStream } = streamRecorder()
		const tool = requestSuggestionsTool({ session, chatStream }) as unknown as ExecutableTool<
			{ artifactId: string },
			unknown
		>

		mocks.getArtifactById.mockResolvedValueOnce(artifact({ content: null }))
		await expect(tool.execute({ artifactId })).resolves.toEqual({
			error: "Artifact not found or has no content",
		})

		mocks.getArtifactById.mockResolvedValueOnce(artifact({ userId: "other-user" }))
		await expect(tool.execute({ artifactId })).rejects.toMatchObject({
			code: "forbidden:artifact:owner_mismatch",
		})
	})

	it("deferred clear helper forwards non-delta data immediately", () => {
		const { chatStream, events } = streamRecorder()
		const deferred = createDeferredArtifactClearWriter(chatStream)

		deferred.writeData({ type: "artifact-title", content: "Renamed" })

		expect(events).toEqual([{ type: "artifact-title", content: "Renamed" }])
	})
})
