import type {
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3StreamPart,
} from "@ai-sdk/provider"
import type { UIMessage } from "ai"
import { convertReadableStreamToArray, MockLanguageModelV3 } from "ai/test"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getArtifactById: vi.fn(),
	saveArtifactVersion: vi.fn(),
	generateUUID: vi.fn(),
}))

vi.mock("@/lib/data/artifact", () => ({
	getArtifactById: mocks.getArtifactById,
	saveArtifactVersion: mocks.saveArtifactVersion,
}))
vi.mock("@/lib/utils/generate-uuid", () => ({ generateUUID: mocks.generateUUID }))

import {
	buildArtifactFixtureTools,
	createArtifactFixtureModel,
	toPersistedArtifactFixtureMessages,
} from "@/features/chat/lib/e2e-artifact-fixture"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { Artifact } from "@/lib/types/entity.types"

type ExecutableTool<Input, Output> = {
	execute(input: Input): Promise<Output>
}

const chatId = "11111111-1111-4111-8111-111111111111"
const artifactId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"
const createdAt = new Date("2026-05-01T00:00:00.000Z")
const modelCallOptions = { prompt: [] } satisfies LanguageModelV3CallOptions

function artifact(overrides?: Partial<Artifact>): Artifact {
	return {
		id: artifactId,
		createdAt,
		title: "Launch Plan",
		content: "Initial content",
		kind: "text",
		userId,
		chatId,
		updatedAt: createdAt,
		...overrides,
	}
}

function streamRecorder() {
	const events: Array<{ type: string; content: unknown }> = []
	const chatStream: ArtifactStreamWriter = {
		writeData(data) {
			events.push(data)
		},
	}
	return { chatStream, events }
}

async function readModelStreamParts(model: LanguageModelV3): Promise<LanguageModelV3StreamPart[]> {
	const result = await model.doStream(modelCallOptions)
	return convertReadableStreamToArray(result.stream)
}

describe("e2e artifact fixture AI SDK mock model", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.generateUUID
			.mockReturnValueOnce("artifact-fixture-id")
			.mockReturnValueOnce("assistant-message-id")
		mocks.getArtifactById.mockResolvedValue(artifact())
		mocks.saveArtifactVersion.mockResolvedValue(artifact({ id: "artifact-fixture-id" }))
	})

	it("uses the AI SDK MockLanguageModelV3 create stream to emit deterministic create tool calls", async () => {
		const model = await createArtifactFixtureModel({
			prompt: "Create a text artifact titled 'Launch Plan'",
		})

		expect(model).toBeInstanceOf(MockLanguageModelV3)
		const parts = await readModelStreamParts(model)

		expect(parts).toContainEqual(
			expect.objectContaining({ type: "tool-input-start", toolName: "createArtifact" }),
		)
		expect(parts).toContainEqual(
			expect.objectContaining({
				type: "tool-call",
				toolName: "createArtifact",
				input: JSON.stringify({ title: "Launch Plan", kind: "text" }),
			}),
		)
		expect(parts).toContainEqual(
			expect.objectContaining({ type: "finish", finishReason: { unified: "tool-calls" } }),
		)
	})

	it("uses the AI SDK MockLanguageModelV3 update stream to emit deterministic update tool calls", async () => {
		const prompt = "Update the current artifact with launch risks"
		const model = await createArtifactFixtureModel({ prompt, artifactId })

		expect(model).toBeInstanceOf(MockLanguageModelV3)
		const parts = await readModelStreamParts(model)

		expect(parts).toContainEqual(
			expect.objectContaining({
				type: "tool-call",
				toolName: "updateArtifact",
				input: JSON.stringify({ id: artifactId, description: prompt }),
			}),
		)
	})

	it("persists create fixture tool output and assistant fixture messages deterministically", async () => {
		const { chatStream, events } = streamRecorder()
		const tools = buildArtifactFixtureTools({
			chatId,
			session: { userId, isGuest: false },
			chatStream,
		})
		const createArtifact = tools.createArtifact as unknown as ExecutableTool<
			{ title: string; kind: "text" },
			{ id: string; title: string; kind: string; content: string }
		>

		const result = await createArtifact.execute({ title: "Launch Plan", kind: "text" })
		const persistedMessages = toPersistedArtifactFixtureMessages([
			{ id: "response-1", role: "assistant", parts: [{ type: "text", text: " Created. " }] },
		] satisfies UIMessage[])

		expect(events.map((event) => event.type)).toEqual([
			"artifact-kind",
			"artifact-id",
			"artifact-title",
			"artifact-clear",
			"artifact-textDelta",
			"artifact-finish",
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "artifact-fixture-id",
				title: "Launch Plan",
				kind: "text",
				userId,
				chatId,
			}),
		)
		expect(result).toMatchObject({
			id: "artifact-fixture-id",
			title: "Launch Plan",
			kind: "text",
			content: 'Created artifact: "Launch Plan"',
		})
		expect(persistedMessages).toEqual([
			{
				id: "assistant-message-id",
				role: "assistant",
				parts: [{ type: "text", text: "Created." }],
			},
		])
	})

	it("streams image fixture creates with artifact-imageDelta", async () => {
		const { chatStream, events } = streamRecorder()
		const tools = buildArtifactFixtureTools({
			chatId,
			session: { userId, isGuest: false },
			chatStream,
		})
		const createArtifact = tools.createArtifact as unknown as ExecutableTool<
			{ title: string; kind: "image" },
			{ id: string; title: string; kind: string; content: string }
		>

		await createArtifact.execute({ title: "Launch Image", kind: "image" })

		expect(events.map((event) => event.type)).toEqual([
			"artifact-kind",
			"artifact-id",
			"artifact-title",
			"artifact-clear",
			"artifact-imageDelta",
			"artifact-finish",
		])
		expect(events).not.toContainEqual(expect.objectContaining({ type: "artifact-textDelta" }))
	})

	it("persists update fixture tool output through the mocked data boundary", async () => {
		const { chatStream, events } = streamRecorder()
		const tools = buildArtifactFixtureTools({
			chatId,
			session: { userId, isGuest: false },
			chatStream,
		})
		const updateArtifact = tools.updateArtifact as unknown as ExecutableTool<
			{ id: string; description: string },
			{ id: string; title: string; kind: string; content: string }
		>

		const result = await updateArtifact.execute({
			id: artifactId,
			description: "Update the current artifact with launch risks",
		})

		expect(events.map((event) => event.type)).toEqual([
			"artifact-clear",
			"artifact-textDelta",
			"artifact-finish",
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith(
			expect.objectContaining({
				id: artifactId,
				title: "Launch Plan",
				kind: "text",
				userId,
				chatId,
			}),
		)
		expect(result).toMatchObject({
			id: artifactId,
			title: "Launch Plan",
			kind: "text",
			content: "The artifact has been updated successfully.",
		})
	})

	it.each([
		["code", "artifact-codeDelta"],
		["sheet", "artifact-sheetDelta"],
		["image", "artifact-imageDelta"],
	] as const)("streams %s fixture updates with replace delta parts", async (kind, deltaType) => {
		const { chatStream, events } = streamRecorder()
		mocks.getArtifactById.mockResolvedValue(artifact({ kind }))
		const tools = buildArtifactFixtureTools({
			chatId,
			session: { userId, isGuest: false },
			chatStream,
		})
		const updateArtifact = tools.updateArtifact as unknown as ExecutableTool<
			{ id: string; description: string },
			{ id: string; title: string; kind: string; content: string }
		>

		await updateArtifact.execute({
			id: artifactId,
			description: `Update the ${kind} artifact`,
		})

		expect(events.map((event) => event.type)).toEqual([
			"artifact-clear",
			deltaType,
			"artifact-finish",
		])
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith(
			expect.objectContaining({
				id: artifactId,
				kind,
				userId,
			}),
		)
	})
})
