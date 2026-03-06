import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CreateArtifactParams, UpdateArtifactParams } from "@/lib/types/artifact-handler.types"

const {
	mockGetUpdateArtifactPrompt,
	mockLanguageModel,
	mockRegisterArtifactHandler,
	mockSmoothStream,
	mockStreamObject,
	mockStreamText,
} = vi.hoisted(() => ({
	mockGetUpdateArtifactPrompt: vi.fn(),
	mockLanguageModel: vi.fn(),
	mockRegisterArtifactHandler: vi.fn(),
	mockSmoothStream: vi.fn(),
	mockStreamObject: vi.fn(),
	mockStreamText: vi.fn(),
}))

vi.mock("ai", () => ({
	smoothStream: (...args: unknown[]) => mockSmoothStream(...args),
	streamObject: (...args: unknown[]) => mockStreamObject(...args),
	streamText: (...args: unknown[]) => mockStreamText(...args),
}))

vi.mock("@/lib/ai/prompts", () => ({
	CODE_PROMPT: "CODE_PROMPT_MOCK",
	SHEET_PROMPT: "SHEET_PROMPT_MOCK",
	getUpdateArtifactPrompt: (...args: unknown[]) => mockGetUpdateArtifactPrompt(...args),
}))

vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: (...args: unknown[]) => mockLanguageModel(...args),
	},
}))

vi.mock("@/lib/ai/artifact-handlers", () => ({
	registerArtifactHandler: (...args: unknown[]) => mockRegisterArtifactHandler(...args),
}))

import { codeHandler } from "@/features/artifacts/handlers/code-handler"
import { imageHandler } from "@/features/artifacts/handlers/image-handler"
import { sheetHandler } from "@/features/artifacts/handlers/sheet-handler"
import { textHandler } from "@/features/artifacts/handlers/text-handler"
import { ARTIFACT_MODEL } from "@/lib/types/model.types"

async function* toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
	for (const item of items) {
		yield item
	}
}

function createCreateParams(overrides: Partial<CreateArtifactParams> = {}): CreateArtifactParams {
	return {
		id: "artifact-1",
		title: "Draft title",
		kind: "text",
		chatId: "chat-1",
		session: {
			userId: "user-1",
			isGuest: false,
		},
		chatStream: {
			writeData: vi.fn(),
		},
		...overrides,
	}
}

function createUpdateParams(overrides: Partial<UpdateArtifactParams> = {}): UpdateArtifactParams {
	return {
		id: "artifact-1",
		title: "Draft title",
		kind: "text",
		currentContent: "Previous content",
		description: "Improve it",
		session: {
			userId: "user-1",
			isGuest: false,
		},
		chatStream: {
			writeData: vi.fn(),
		},
		...overrides,
	}
}

describe("artifact handlers", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockGetUpdateArtifactPrompt.mockReturnValue("UPDATE_PROMPT_MOCK")
		mockLanguageModel.mockReturnValue("model-instance")
		mockSmoothStream.mockReturnValue("smooth-transform")
	})

	describe("textHandler", () => {
		it("create streams text deltas and appends content", async () => {
			const params = createCreateParams({
				title: "Write a launch summary",
				kind: "text",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockStreamText.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "reasoning", text: "skip" },
					{ type: "text-delta", text: "Hello " },
					{ type: "text-delta", text: "world" },
				]),
			})

			const result = await textHandler.create(params)

			expect(result).toBe("Hello world")
			expect(mockLanguageModel).toHaveBeenCalledWith(ARTIFACT_MODEL)
			expect(mockSmoothStream).toHaveBeenCalledWith({ chunking: "word" })
			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "model-instance",
					prompt: "Write a launch summary",
					system: expect.stringContaining("Write about the given topic"),
					experimental_transform: "smooth-transform",
				}),
			)
			expect(writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-textDelta",
				content: "Hello ",
			})
			expect(writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-textDelta",
				content: "world",
			})
		})

		it("create returns empty content when no text deltas are emitted", async () => {
			const params = createCreateParams({ kind: "text" })
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockStreamText.mockReturnValue({
				fullStream: toAsyncIterable([{ type: "tool-call", toolName: "noop" }]),
			})

			const result = await textHandler.create(params)

			expect(result).toBe("")
			expect(writeData).not.toHaveBeenCalled()
		})

		it("update uses update prompt and streams text deltas", async () => {
			const params = createUpdateParams({
				kind: "text",
				currentContent: "Old draft",
				description: "Add a conclusion",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockGetUpdateArtifactPrompt.mockReturnValue("TEXT_UPDATE_PROMPT")
			mockStreamText.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "text-delta", text: "Updated" },
					{ type: "text-delta", text: " draft" },
				]),
			})

			const result = await textHandler.update(params)

			expect(result).toBe("Updated draft")
			expect(mockGetUpdateArtifactPrompt).toHaveBeenCalledWith("Old draft", "text")
			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "TEXT_UPDATE_PROMPT",
					prompt: "Add a conclusion",
				}),
			)
			expect(writeData).toHaveBeenCalledTimes(2)
		})
	})

	describe("codeHandler", () => {
		it("create streams object deltas with replace semantics and keeps the latest code", async () => {
			const params = createCreateParams({
				kind: "code",
				title: "Write fibonacci",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockStreamObject.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "object", object: { code: "print('one')" } },
					{ type: "object", object: { code: "" } },
					{ type: "object", object: { code: "print('two')" } },
					{ type: "text-delta", text: "ignore" },
				]),
			})

			const result = await codeHandler.create(params)

			expect(result).toBe("print('two')")
			expect(mockStreamObject).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "model-instance",
					system: "CODE_PROMPT_MOCK",
					prompt: "Write fibonacci",
				}),
			)
			expect(writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-codeDelta",
				content: "print('one')",
			})
			expect(writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-codeDelta",
				content: "print('two')",
			})

			const streamArgs = mockStreamObject.mock.calls[0]?.[0] as {
				schema: { safeParse: (value: unknown) => { success: boolean } }
			}
			expect(streamArgs.schema.safeParse({ code: "print(1)" }).success).toBe(true)
			expect(streamArgs.schema.safeParse({ csv: "a,b" }).success).toBe(false)
		})

		it("update returns empty string when object deltas are missing usable code", async () => {
			const params = createUpdateParams({
				kind: "code",
				currentContent: "print('old')",
				description: "Refactor",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockGetUpdateArtifactPrompt.mockReturnValue("CODE_UPDATE_PROMPT")
			mockStreamObject.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "object", object: { code: "" } },
					{ type: "reasoning", text: "skip" },
				]),
			})

			const result = await codeHandler.update(params)

			expect(result).toBe("")
			expect(mockGetUpdateArtifactPrompt).toHaveBeenCalledWith("print('old')", "code")
			expect(mockStreamObject).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "CODE_UPDATE_PROMPT",
					prompt: "Refactor",
				}),
			)
			expect(writeData).not.toHaveBeenCalled()
		})
	})

	describe("sheetHandler", () => {
		it("create streams csv content and keeps the latest sheet delta", async () => {
			const params = createCreateParams({
				kind: "sheet",
				title: "Revenue table",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockStreamObject.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "object", object: { csv: "month,revenue\nJan,100" } },
					{ type: "object", object: { csv: "month,revenue\nJan,100\nFeb,120" } },
				]),
			})

			const result = await sheetHandler.create(params)

			expect(result).toBe("month,revenue\nJan,100\nFeb,120")
			expect(mockStreamObject).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "SHEET_PROMPT_MOCK",
					prompt: "Revenue table",
				}),
			)
			expect(writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-sheetDelta",
				content: "month,revenue\nJan,100",
			})
			expect(writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-sheetDelta",
				content: "month,revenue\nJan,100\nFeb,120",
			})

			const streamArgs = mockStreamObject.mock.calls[0]?.[0] as {
				schema: { safeParse: (value: unknown) => { success: boolean } }
			}
			expect(streamArgs.schema.safeParse({ csv: "a,b" }).success).toBe(true)
			expect(streamArgs.schema.safeParse({ code: "print(1)" }).success).toBe(false)
		})

		it("update uses the provided kind and skips empty csv deltas", async () => {
			const params = createUpdateParams({
				kind: "sheet",
				currentContent: "month,revenue\nJan,100",
				description: "Add February",
			})
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockGetUpdateArtifactPrompt.mockReturnValue("SHEET_UPDATE_PROMPT")
			mockStreamObject.mockReturnValue({
				fullStream: toAsyncIterable([
					{ type: "object", object: { csv: "" } },
					{ type: "object", object: { csv: "month,revenue\nJan,100\nFeb,120" } },
				]),
			})

			const result = await sheetHandler.update(params)

			expect(result).toBe("month,revenue\nJan,100\nFeb,120")
			expect(mockGetUpdateArtifactPrompt).toHaveBeenCalledWith(
				"month,revenue\nJan,100",
				"sheet",
			)
			expect(mockStreamObject).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "SHEET_UPDATE_PROMPT",
					prompt: "Add February",
				}),
			)
			expect(writeData).toHaveBeenCalledTimes(1)
		})

		it("update returns empty content when no csv is emitted", async () => {
			const params = createUpdateParams({ kind: "sheet" })
			const writeData = vi.fn()
			params.chatStream = { writeData }

			mockStreamObject.mockReturnValue({
				fullStream: toAsyncIterable([{ type: "reasoning", text: "ignore" }]),
			})

			const result = await sheetHandler.update(params)

			expect(result).toBe("")
			expect(writeData).not.toHaveBeenCalled()
		})
	})

	describe("imageHandler", () => {
		it("create always returns an empty string", async () => {
			const result = await imageHandler.create(createCreateParams({ kind: "image" }))

			expect(result).toBe("")
		})

		it("update returns the existing content unchanged", async () => {
			const result = await imageHandler.update(
				createUpdateParams({
					kind: "image",
					currentContent: "data:image/png;base64,abc123",
				}),
			)

			expect(result).toBe("data:image/png;base64,abc123")
		})
	})

	describe("handlers index side effects", () => {
		it("registers every artifact handler on module import", async () => {
			await import("@/features/artifacts/handlers")

			expect(mockRegisterArtifactHandler).toHaveBeenCalledTimes(4)
			expect(mockRegisterArtifactHandler).toHaveBeenNthCalledWith(1, "text", textHandler)
			expect(mockRegisterArtifactHandler).toHaveBeenNthCalledWith(2, "code", codeHandler)
			expect(mockRegisterArtifactHandler).toHaveBeenNthCalledWith(3, "sheet", sheetHandler)
			expect(mockRegisterArtifactHandler).toHaveBeenNthCalledWith(4, "image", imageHandler)
		})
	})
})
