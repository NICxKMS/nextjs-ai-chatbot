import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { convertToUIMessages, getMessageText } from "@/features/chat/lib/message-utils"
import { DEFAULT_ARTIFACT, processStreamDelta } from "@/features/chat/lib/process-stream-deltas"
import { createArtifactTool } from "@/features/chat/lib/tools/create-artifact"
import { requestSuggestionsTool } from "@/features/chat/lib/tools/request-suggestions"
import { updateArtifactTool } from "@/features/chat/lib/tools/update-artifact"
import { getWeather } from "@/features/chat/lib/tools/weather"
import { AppError } from "@/lib/errors/app-error"
import { createMockMessage } from "@/tests/fixtures/chat"
import { TEST_OTHER_USER_ID, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

type ToolLike<TInput = unknown, TResult = unknown> = {
	description: string
	inputSchema: {
		safeParse: (value: unknown) => { success: boolean; data?: TInput }
	}
	execute: (input: TInput) => Promise<TResult>
}

function asTool<TInput, TResult>(value: unknown): ToolLike<TInput, TResult> {
	return value as ToolLike<TInput, TResult>
}

async function* toAsyncIterable<T>(items: T[]) {
	for (const item of items) {
		yield item
	}
}

function createFetchResponse(ok: boolean, body: unknown): Response {
	return {
		ok,
		json: async () => body,
	} as Response
}

const {
	mockStreamObject,
	mockGetArtifactHandler,
	mockSaveArtifactVersion,
	mockGetArtifactById,
	mockSaveSuggestions,
	mockGenerateUUID,
	mockLanguageModel,
} = vi.hoisted(() => ({
	mockStreamObject: vi.fn(),
	mockGetArtifactHandler: vi.fn(),
	mockSaveArtifactVersion: vi.fn(),
	mockGetArtifactById: vi.fn(),
	mockSaveSuggestions: vi.fn(),
	mockGenerateUUID: vi.fn(),
	mockLanguageModel: vi.fn(),
}))

vi.mock("ai", () => ({
	tool: (config: unknown) => config,
	streamObject: (...args: unknown[]) => mockStreamObject(...args),
}))

vi.mock("@/lib/ai/artifact-handlers", () => ({
	getArtifactHandler: (...args: unknown[]) => mockGetArtifactHandler(...args),
}))

vi.mock("@/lib/data/artifact", () => ({
	saveArtifactVersion: (...args: unknown[]) => mockSaveArtifactVersion(...args),
	getArtifactById: (...args: unknown[]) => mockGetArtifactById(...args),
}))

vi.mock("@/lib/data/suggestion", () => ({
	saveSuggestions: (...args: unknown[]) => mockSaveSuggestions(...args),
}))

vi.mock("@/lib/utils/generate-uuid", () => ({
	generateUUID: (...args: unknown[]) => mockGenerateUUID(...args),
}))

vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: (...args: unknown[]) => mockLanguageModel(...args),
	},
}))

const originalFetch = globalThis.fetch

describe("chat library utilities", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockGenerateUUID.mockReturnValue("generated-id")
		globalThis.fetch = originalFetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	describe("message-utils", () => {
		it("convertToUIMessages maps DB messages into UI messages", () => {
			const dbMessages = [
				createMockMessage({
					id: "message-1",
					role: "user",
					parts: [{ type: "text", text: "Hello" }],
				}),
				createMockMessage({
					id: "message-2",
					role: "assistant",
					parts: [{ type: "text", text: "Hi there" }],
				}),
			]

			const result = convertToUIMessages(dbMessages)

			expect(result).toEqual([
				{ id: "message-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
				{ id: "message-2", role: "assistant", parts: [{ type: "text", text: "Hi there" }] },
			])
		})

		it("getMessageText joins only text parts with new lines", () => {
			const message: Parameters<typeof getMessageText>[0] = {
				id: "message-1",
				role: "assistant",
				parts: [
					{ type: "text", text: "First line" },
					{
						type: "file",
						mediaType: "text/plain",
						name: "notes.txt",
						url: "https://example.com/notes.txt",
					},
					{ type: "text", text: "Second line" },
				],
			} as unknown as Parameters<typeof getMessageText>[0]

			const result = getMessageText(message)

			expect(result).toBe("First line\nSecond line")
		})

		it("getMessageText returns an empty string when no text parts exist", () => {
			const message: Parameters<typeof getMessageText>[0] = {
				id: "message-2",
				role: "assistant",
				parts: [
					{
						type: "file",
						mediaType: "image/png",
						name: "image.png",
						url: "https://example.com/image.png",
					},
				],
			} as unknown as Parameters<typeof getMessageText>[0]

			expect(getMessageText(message)).toBe("")
		})
	})

	describe("process-stream-deltas", () => {
		it("sets artifact id, visibility, and streaming status", () => {
			const current = { ...DEFAULT_ARTIFACT }

			const { artifact } = processStreamDelta(
				{ type: "artifact-id", content: "artifact-1" },
				current,
			)

			expect(artifact.artifactId).toBe("artifact-1")
			expect(artifact.isVisible).toBe(true)
			expect(artifact.status).toBe("streaming")
		})

		it("appends text deltas for artifact-textDelta", () => {
			const current = {
				...DEFAULT_ARTIFACT,
				content: "Hello",
			}

			const { artifact } = processStreamDelta(
				{ type: "artifact-textDelta", content: " world" },
				current,
			)

			expect(artifact.content).toBe("Hello world")
		})

		it("replaces content for code/sheet/image deltas", () => {
			const current = {
				...DEFAULT_ARTIFACT,
				content: "old content",
			}

			expect(
				processStreamDelta({ type: "artifact-codeDelta", content: "new code" }, current)
					.artifact.content,
			).toBe("new code")
			expect(
				processStreamDelta({ type: "artifact-sheetDelta", content: "new sheet" }, current)
					.artifact.content,
			).toBe("new sheet")
			expect(
				processStreamDelta({ type: "artifact-imageDelta", content: "new image" }, current)
					.artifact.content,
			).toBe("new image")
		})

		it("clears content and suggestions on artifact-clear", () => {
			const current = {
				...DEFAULT_ARTIFACT,
				content: "existing",
				suggestions: [{ originalText: "a", suggestedText: "b", description: "c" }],
			}

			const { artifact } = processStreamDelta(
				{ type: "artifact-clear", content: "" },
				current,
			)

			expect(artifact.content).toBe("")
			expect(artifact.suggestions).toEqual([])
		})

		it("appends artifact suggestions", () => {
			const current = {
				...DEFAULT_ARTIFACT,
				suggestions: [{ originalText: "old", suggestedText: "new", description: "one" }],
			}

			const { artifact } = processStreamDelta(
				{
					type: "artifact-suggestion",
					content: {
						originalText: "before",
						suggestedText: "after",
						description: "improve wording",
					},
				},
				current,
			)

			expect(artifact.suggestions).toHaveLength(2)
			expect(artifact.suggestions?.[1]).toEqual({
				originalText: "before",
				suggestedText: "after",
				description: "improve wording",
			})
		})

		it("returns the current artifact for non-artifact deltas", () => {
			const current = {
				...DEFAULT_ARTIFACT,
				title: "Current",
			}

			expect(
				processStreamDelta({ type: "chat-title", content: "Chat" }, current).artifact,
			).toBe(current)
			expect(processStreamDelta({ type: "usage", content: "{}" }, current).artifact).toBe(
				current,
			)
			expect(processStreamDelta({ type: "error", content: "boom" }, current).artifact).toBe(
				current,
			)
		})
	})

	describe("createArtifactTool", () => {
		it("defines a schema that accepts text/code/sheet and rejects image", () => {
			const chatStream = { writeData: vi.fn() }
			const toolConfig = asTool<{ title: string; kind: "text" | "code" | "sheet" }, unknown>(
				createArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
					chatId: "chat-1",
				}),
			)

			expect(toolConfig.description).toContain("Create a new artifact")
			expect(toolConfig.inputSchema.safeParse({ title: "Doc", kind: "text" }).success).toBe(
				true,
			)
			expect(toolConfig.inputSchema.safeParse({ title: "Doc", kind: "code" }).success).toBe(
				true,
			)
			expect(toolConfig.inputSchema.safeParse({ title: "Doc", kind: "sheet" }).success).toBe(
				true,
			)
			expect(toolConfig.inputSchema.safeParse({ title: "Doc", kind: "image" }).success).toBe(
				false,
			)
		})

		it("writes lifecycle stream events, delegates to handler, and persists artifact", async () => {
			const chatStream = { writeData: vi.fn() }
			const handler = {
				create: vi.fn().mockResolvedValue("artifact body"),
				update: vi.fn(),
			}
			mockGetArtifactHandler.mockReturnValue(handler)
			mockGenerateUUID.mockReturnValue("artifact-uuid")
			mockSaveArtifactVersion.mockResolvedValue(undefined)

			const toolConfig = asTool<{ title: string; kind: "text" | "code" | "sheet" }, unknown>(
				createArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
					chatId: "chat-1",
				}),
			)

			const result = await toolConfig.execute({ title: "Design Spec", kind: "text" })

			expect(mockGetArtifactHandler).toHaveBeenCalledWith("text")
			expect(handler.create).toHaveBeenCalledWith({
				id: "artifact-uuid",
				title: "Design Spec",
				kind: "text",
				chatId: "chat-1",
				session: { userId: TEST_USER_ID, isGuest: false },
				chatStream,
			})
			expect(mockSaveArtifactVersion).toHaveBeenCalledWith({
				id: "artifact-uuid",
				title: "Design Spec",
				content: "artifact body",
				kind: "text",
				userId: TEST_USER_ID,
				chatId: "chat-1",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-kind",
				content: "text",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-id",
				content: "artifact-uuid",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(3, {
				type: "artifact-title",
				content: "Design Spec",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(4, {
				type: "artifact-clear",
				content: "",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(5, {
				type: "artifact-finish",
				content: "",
			})
			expect(result).toEqual({
				id: "artifact-uuid",
				title: "Design Spec",
				kind: "text",
				content: 'Created artifact: "Design Spec"',
			})
		})

		it("rejects blank handler output instead of persisting an empty artifact", async () => {
			const chatStream = { writeData: vi.fn() }
			const handler = {
				create: vi.fn().mockResolvedValue(""),
				update: vi.fn(),
			}
			mockGetArtifactHandler.mockReturnValue(handler)
			mockGenerateUUID.mockReturnValue("artifact-uuid")

			const toolConfig = asTool<{ title: string; kind: "text" | "code" | "sheet" }, unknown>(
				createArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
					chatId: "chat-1",
				}),
			)

			await expect(
				toolConfig.execute({ title: "Design Spec", kind: "text" }),
			).rejects.toMatchObject({
				code: "ai_error:artifact:empty_output",
				message: "Artifact create produced no content",
			})

			expect(mockSaveArtifactVersion).not.toHaveBeenCalled()
			expect(chatStream.writeData).not.toHaveBeenNthCalledWith(5, {
				type: "artifact-finish",
				content: "",
			})
		})
	})

	describe("updateArtifactTool", () => {
		it("expects id (not artifactId) in its input schema", () => {
			const chatStream = { writeData: vi.fn() }
			const toolConfig = asTool<{ id: string; description: string }, unknown>(
				updateArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			expect(
				toolConfig.inputSchema.safeParse({ id: "artifact-1", description: "refresh" })
					.success,
			).toBe(true)
			expect(
				toolConfig.inputSchema.safeParse({
					artifactId: "artifact-1",
					description: "refresh",
				}).success,
			).toBe(false)
		})

		it("returns a not-found error object when artifact does not exist", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue(null)

			const toolConfig = asTool<{ id: string; description: string }, unknown>(
				updateArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			const result = await toolConfig.execute({ id: "artifact-1", description: "refresh" })

			expect(result).toEqual({ error: "Artifact not found" })
			expect(chatStream.writeData).not.toHaveBeenCalled()
		})

		it("throws forbidden when artifact owner does not match session user", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "existing",
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt: new Date("2026-01-01T00:00:00Z"),
			})

			const toolConfig = asTool<{ id: string; description: string }, unknown>(
				updateArtifactTool({
					session: { userId: TEST_OTHER_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			await expect(
				toolConfig.execute({ id: "artifact-1", description: "refresh" }),
			).rejects.toMatchObject({
				code: "forbidden:artifact:owner_mismatch",
				message: "Not authorized to modify this artifact",
			})
			expect(mockSaveArtifactVersion).not.toHaveBeenCalled()
		})

		it("updates artifact content through handler and persists the new version", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: null,
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt: new Date("2026-01-01T00:00:00Z"),
			})
			const handler = {
				create: vi.fn(),
				update: vi.fn().mockImplementation(async ({ chatStream: handlerStream }) => {
					handlerStream.writeData({
						type: "artifact-textDelta",
						content: "\n\n",
					})
					handlerStream.writeData({
						type: "artifact-textDelta",
						content: "updated body",
					})

					return "\n\nupdated body"
				}),
			}
			mockGetArtifactHandler.mockReturnValue(handler)
			mockSaveArtifactVersion.mockResolvedValue(undefined)

			const toolConfig = asTool<{ id: string; description: string }, unknown>(
				updateArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			const result = await toolConfig.execute({
				id: "artifact-1",
				description: "refresh tone",
			})

			expect(handler.update).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "artifact-1",
					title: "Doc",
					kind: "text",
					currentContent: "",
					description: "refresh tone",
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream: expect.objectContaining({
						writeData: expect.any(Function),
					}),
				}),
			)
			expect(mockSaveArtifactVersion).toHaveBeenCalledWith({
				id: "artifact-1",
				title: "Doc",
				content: "\n\nupdated body",
				kind: "text",
				userId: TEST_USER_ID,
				chatId: "chat-1",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-clear",
				content: "",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-textDelta",
				content: "\n\nupdated body",
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(3, {
				type: "artifact-finish",
				content: "",
			})
			expect(result).toEqual({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "The artifact has been updated successfully.",
			})
		})

		it("rejects whitespace-only streamed update output without clearing the live artifact", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "existing",
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt: new Date("2026-01-01T00:00:00Z"),
			})
			const handler = {
				create: vi.fn(),
				update: vi.fn().mockImplementation(async ({ chatStream: handlerStream }) => {
					handlerStream.writeData({
						type: "artifact-textDelta",
						content: " \n\t",
					})

					return " \n\t"
				}),
			}
			mockGetArtifactHandler.mockReturnValue(handler)

			const toolConfig = asTool<{ id: string; description: string }, unknown>(
				updateArtifactTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			await expect(
				toolConfig.execute({ id: "artifact-1", description: "refresh tone" }),
			).rejects.toMatchObject({
				code: "ai_error:artifact:empty_output",
				message: "Artifact update produced no content",
			})

			expect(mockSaveArtifactVersion).not.toHaveBeenCalled()
			expect(chatStream.writeData).not.toHaveBeenCalled()
		})
	})

	describe("requestSuggestionsTool", () => {
		it("expects artifactId in its input schema", () => {
			const chatStream = { writeData: vi.fn() }
			const toolConfig = asTool<{ artifactId: string }, unknown>(
				requestSuggestionsTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			expect(toolConfig.inputSchema.safeParse({ artifactId: "artifact-1" }).success).toBe(
				true,
			)
			expect(toolConfig.inputSchema.safeParse({ id: "artifact-1" }).success).toBe(false)
		})

		it("returns an error object when artifact is missing or empty", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue(null)

			const toolConfig = asTool<{ artifactId: string }, unknown>(
				requestSuggestionsTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			const result = await toolConfig.execute({ artifactId: "artifact-1" })

			expect(result).toEqual({ error: "Artifact not found or has no content" })
		})

		it("throws forbidden when artifact owner does not match session user", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "Body",
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt: new Date("2026-01-01T00:00:00Z"),
			})

			const toolConfig = asTool<{ artifactId: string }, unknown>(
				requestSuggestionsTool({
					session: { userId: TEST_OTHER_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			let thrown: unknown
			try {
				await toolConfig.execute({ artifactId: "artifact-1" })
			} catch (error) {
				thrown = error
			}

			expect(thrown).toBeInstanceOf(AppError)
			expect((thrown as AppError).code).toBe("forbidden:artifact:owner_mismatch")
		})

		it("streams suggestions and persists them for authenticated users", async () => {
			const chatStream = { writeData: vi.fn() }
			const createdAt = new Date("2026-01-01T00:00:00Z")
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "Original content",
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt,
			})
			mockLanguageModel.mockReturnValue("artifact-model")
			mockStreamObject.mockReturnValue({
				elementStream: toAsyncIterable([
					{
						originalText: "first",
						suggestedText: "first better",
						description: "clarify",
					},
					{
						originalText: "second",
						suggestedText: "second better",
						description: "tighten",
					},
				]),
			})
			mockGenerateUUID.mockReturnValueOnce("suggestion-1").mockReturnValueOnce("suggestion-2")
			mockSaveSuggestions.mockResolvedValue(undefined)

			const toolConfig = asTool<{ artifactId: string }, unknown>(
				requestSuggestionsTool({
					session: { userId: TEST_USER_ID, isGuest: false },
					chatStream,
				}),
			)

			const result = await toolConfig.execute({ artifactId: "artifact-1" })

			expect(mockLanguageModel).toHaveBeenCalledWith("google:gemini-2.5-flash-lite")
			expect(mockStreamObject).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "artifact-model",
					prompt: "Original content",
					output: "array",
				}),
			)
			expect(chatStream.writeData).toHaveBeenNthCalledWith(1, {
				type: "artifact-suggestion",
				content: {
					originalText: "first",
					suggestedText: "first better",
					description: "clarify",
				},
			})
			expect(chatStream.writeData).toHaveBeenNthCalledWith(2, {
				type: "artifact-suggestion",
				content: {
					originalText: "second",
					suggestedText: "second better",
					description: "tighten",
				},
			})
			expect(mockSaveSuggestions).toHaveBeenCalledWith([
				{
					id: "suggestion-1",
					artifactId: "artifact-1",
					artifactCreatedAt: createdAt,
					originalText: "first",
					suggestedText: "first better",
					description: "clarify",
					isResolved: false,
					userId: TEST_USER_ID,
					createdAt: expect.any(Date),
				},
				{
					id: "suggestion-2",
					artifactId: "artifact-1",
					artifactCreatedAt: createdAt,
					originalText: "second",
					suggestedText: "second better",
					description: "tighten",
					isResolved: false,
					userId: TEST_USER_ID,
					createdAt: expect.any(Date),
				},
			])
			expect(result).toEqual({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				message: "Suggestions generated.",
			})
		})

		it("streams suggestions but does not persist for guest sessions", async () => {
			const chatStream = { writeData: vi.fn() }
			mockGetArtifactById.mockResolvedValue({
				id: "artifact-1",
				title: "Doc",
				kind: "text",
				content: "Original content",
				userId: TEST_USER_ID,
				chatId: "chat-1",
				createdAt: new Date("2026-01-01T00:00:00Z"),
			})
			mockLanguageModel.mockReturnValue("artifact-model")
			mockStreamObject.mockReturnValue({
				elementStream: toAsyncIterable([
					{
						originalText: "first",
						suggestedText: "first better",
						description: "clarify",
					},
				]),
			})

			const toolConfig = asTool<{ artifactId: string }, unknown>(
				requestSuggestionsTool({
					session: { userId: TEST_USER_ID, isGuest: true },
					chatStream,
				}),
			)

			await toolConfig.execute({ artifactId: "artifact-1" })

			expect(chatStream.writeData).toHaveBeenCalledTimes(1)
			expect(mockSaveSuggestions).not.toHaveBeenCalled()
		})
	})

	describe("weather tool", () => {
		it("accepts both city and coordinate input shapes", () => {
			const weatherTool = asTool<
				{ city: string } | { latitude: number; longitude: number },
				unknown
			>(getWeather)

			expect(weatherTool.inputSchema.safeParse({ city: "London" }).success).toBe(true)
			expect(
				weatherTool.inputSchema.safeParse({ latitude: 37.77, longitude: -122.41 }).success,
			).toBe(true)
		})

		it("fetches weather directly for coordinate input", async () => {
			const weatherTool = asTool<{ latitude: number; longitude: number }, unknown>(getWeather)
			const fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
			fetchMock.mockResolvedValue(
				createFetchResponse(true, {
					current: { temperature_2m: 24 },
					hourly: {},
					daily: {},
				}),
			)

			const result = await weatherTool.execute({ latitude: 10, longitude: 20 })

			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("api.open-meteo.com/v1/forecast?latitude=10&longitude=20"),
			)
			expect(result).toEqual({ current: { temperature_2m: 24 }, hourly: {}, daily: {} })
		})

		it("geocodes a city name before fetching weather and returns cityName", async () => {
			const weatherTool = asTool<{ city: string }, unknown>(getWeather)
			const fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
			fetchMock
				.mockResolvedValueOnce(
					createFetchResponse(true, {
						results: [{ latitude: 40.7128, longitude: -74.006 }],
					}),
				)
				.mockResolvedValueOnce(
					createFetchResponse(true, {
						current: { temperature_2m: 18 },
						hourly: {},
						daily: {},
					}),
				)

			const result = await weatherTool.execute({ city: "New York" })

			expect(fetchMock).toHaveBeenCalledTimes(2)
			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				expect.stringContaining("geocoding-api.open-meteo.com/v1/search?name=New%20York"),
			)
			expect(fetchMock).toHaveBeenNthCalledWith(
				2,
				expect.stringContaining(
					"api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006",
				),
			)
			expect(result).toEqual({
				current: { temperature_2m: 18 },
				hourly: {},
				daily: {},
				cityName: "New York",
			})
		})

		it("returns a city lookup error when geocoding fails", async () => {
			const weatherTool = asTool<{ city: string }, unknown>(getWeather)
			const fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
			fetchMock.mockResolvedValue(createFetchResponse(true, { results: [] }))

			const result = await weatherTool.execute({ city: "Unknown City" })

			expect(result).toEqual({
				error: 'Could not find coordinates for "Unknown City". Please check the city name.',
			})
		})

		it("returns an API error when weather fetch fails", async () => {
			const weatherTool = asTool<{ city: string }, unknown>(getWeather)
			const fetchMock = vi.fn()
			globalThis.fetch = fetchMock as unknown as typeof fetch
			fetchMock
				.mockResolvedValueOnce(
					createFetchResponse(true, {
						results: [{ latitude: 35.68, longitude: 139.76 }],
					}),
				)
				.mockResolvedValueOnce(createFetchResponse(false, {}))

			const result = await weatherTool.execute({ city: "Tokyo" })

			expect(result).toEqual({ error: "Failed to fetch weather data from Open-Meteo API." })
		})
	})
})
