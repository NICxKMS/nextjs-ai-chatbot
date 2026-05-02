import type { UIMessage } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	checkRateLimit: vi.fn(),
	getAvailableModels: vi.fn(),
	getChatById: vi.fn(),
	getMessagesForChatRender: vi.fn(),
	createChatWithInitialMessage: vi.fn(),
	saveMessages: vi.fn(),
	saveMessagesAndTouchChat: vi.fn(),
	ensureGuestUser: vi.fn(),
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
	convertToUIMessages: vi.fn(),
	convertToModelMessages: vi.fn(),
	createArtifactTool: vi.fn(),
	updateArtifactTool: vi.fn(),
	requestSuggestionsTool: vi.fn(),
	getWeather: vi.fn(),
	getEnabledTools: vi.fn(),
	composeSystemPrompt: vi.fn(),
	getProviderOptions: vi.fn(),
	languageModel: vi.fn(),
	generateTitle: vi.fn(),
	getLatestArtifactByChatId: vi.fn(),
	loggerError: vi.fn(),
	streamWrites: [] as Array<{ type: string; data?: unknown }>,
}))

vi.mock("ai", () => ({
	convertToModelMessages: mocks.convertToModelMessages,
	createUIMessageStream: (options: {
		execute(args: {
			writer: {
				write(part: { type: string; data?: unknown }): void
				merge(stream: unknown): void
			}
		}): Promise<void>
	}) =>
		new ReadableStream({
			async start(controller) {
				await options.execute({
					writer: {
						write(part) {
							mocks.streamWrites.push(part)
						},
						merge(stream) {
							void stream
						},
					},
				})
				controller.close()
			},
		}),
	JsonToSseTransformStream: TransformStream,
	smoothStream: vi.fn(() => "smooth-transform"),
	stepCountIs: vi.fn((count: number) => `steps:${count}`),
	streamText: vi.fn((options: { tools?: unknown }) => ({
		usage: Promise.resolve({ inputTokens: 4, outputTokens: 2, totalTokens: 6 }),
		toUIMessageStream: ({
			onFinish,
		}: {
			onFinish(args: { messages: UIMessage[] }): Promise<void>
		}) => {
			void onFinish({
				messages: [
					{
						id: "assistant-message",
						role: "assistant",
						parts: [{ type: "text", text: "Hi" }],
					},
				],
			})
			return { tools: options.tools }
		},
	})),
}))
vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/features/models/lib/models", () => ({ getAvailableModels: mocks.getAvailableModels }))
vi.mock("@/lib/data/chat", () => ({
	createChatWithInitialMessage: mocks.createChatWithInitialMessage,
	getChatById: mocks.getChatById,
	saveMessagesAndTouchChat: mocks.saveMessagesAndTouchChat,
}))
vi.mock("@/lib/data/message", () => ({
	getMessagesForChatRender: mocks.getMessagesForChatRender,
	saveMessages: mocks.saveMessages,
}))
vi.mock("@/lib/data/user", () => ({ ensureGuestUser: mocks.ensureGuestUser }))
vi.mock("@/lib/cache/revalidate", () => ({
	refreshChat: mocks.refreshChat,
	refreshChatList: mocks.refreshChatList,
}))
vi.mock("@/features/chat/lib/message-utils", () => ({
	convertToUIMessages: mocks.convertToUIMessages,
}))
vi.mock("@/features/chat/lib/tools/create-artifact", () => ({
	createArtifactTool: mocks.createArtifactTool,
}))
vi.mock("@/features/chat/lib/tools/update-artifact", () => ({
	updateArtifactTool: mocks.updateArtifactTool,
}))
vi.mock("@/features/chat/lib/tools/request-suggestions", () => ({
	requestSuggestionsTool: mocks.requestSuggestionsTool,
}))
vi.mock("@/features/chat/lib/tools/weather", () => ({ getWeather: mocks.getWeather }))
vi.mock("@/lib/ai/tools", () => ({ getEnabledTools: mocks.getEnabledTools }))
vi.mock("@/lib/ai/prompts", () => ({ composeSystemPrompt: mocks.composeSystemPrompt }))
vi.mock("@/lib/ai/provider-options", () => ({ getProviderOptions: mocks.getProviderOptions }))
vi.mock("@/lib/ai/provider", () => ({ myProvider: { languageModel: mocks.languageModel } }))
vi.mock("@/lib/ai/title", () => ({ generateTitle: mocks.generateTitle }))
vi.mock("@/lib/data/artifact-chat", () => ({
	getLatestArtifactByChatId: mocks.getLatestArtifactByChatId,
}))
vi.mock("@/lib/utils/logger", () => ({ logger: { error: mocks.loggerError } }))
vi.mock("@/features/artifacts/handlers", () => ({}))

import { POST } from "@/app/api/chat/route"
import {
	buildChatTools,
	CHAT_PERSISTENCE_FAILURE_SIGNAL,
	enforceChatRateLimit,
	persistChatResponse,
	readChatRequest,
	recoverChatPersistenceFailure,
	requireChatSession,
	resolveChatRouteContext,
} from "@/features/chat/lib/chat-route"
import type { ChatRequest } from "@/features/chat/schemas/chat.schema"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import type { AppSession } from "@/lib/auth/session"
import type { ModelMetadata } from "@/lib/types/model.types"

const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"

const toolModel: ModelMetadata = {
	id: "google:gemma-3-4b-it",
	provider: "google",
	providerModelId: "gemma-3-4b-it",
	name: "Gemma",
	supportsToolCalling: true,
	supportsReasoning: false,
	modalities: { input: ["text"], output: ["text"] },
	contextWindow: 8192,
	maxOutputTokens: 4096,
	source: "static",
}

const noToolModel: ModelMetadata = {
	...toolModel,
	id: "google:no-tools",
	supportsToolCalling: false,
}
const session: AppSession = { user: { id: userId, type: "authenticated" } }
const customSettings = { ...DEFAULT_SETTINGS, temperature: 1.1, systemPrompt: "Be brief." }
const requestData: ChatRequest = {
	id: chatId,
	message: { id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
	selectedChatModel: toolModel.id,
	selectedVisibilityType: "private",
	settings: customSettings,
}

function chatRequest(body: unknown, origin = "https://app.example.com") {
	return new Request("https://app.example.com/api/chat", {
		method: "POST",
		headers: { origin, "content-type": "application/json" },
		body: typeof body === "string" ? body : JSON.stringify(body),
	})
}

describe("chat route stream integration flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.streamWrites.length = 0
		mocks.getAppSession.mockResolvedValue(session)
		mocks.checkRateLimit.mockResolvedValue(true)
		mocks.getAvailableModels.mockResolvedValue([toolModel, noToolModel])
		mocks.getChatById.mockResolvedValue(null)
		mocks.getMessagesForChatRender.mockResolvedValue([])
		mocks.createChatWithInitialMessage.mockResolvedValue(undefined)
		mocks.saveMessages.mockResolvedValue(undefined)
		mocks.saveMessagesAndTouchChat.mockResolvedValue(undefined)
		mocks.ensureGuestUser.mockResolvedValue(undefined)
		mocks.convertToUIMessages.mockReturnValue([])
		mocks.convertToModelMessages.mockResolvedValue([{ role: "user", content: "Hello" }])
		mocks.getEnabledTools.mockImplementation((model: ModelMetadata) =>
			model.supportsToolCalling ? ["getWeather"] : [],
		)
		mocks.composeSystemPrompt.mockReturnValue("system prompt")
		mocks.getProviderOptions.mockReturnValue({ temperature: customSettings.temperature })
		mocks.languageModel.mockReturnValue("language-model")
		mocks.generateTitle.mockResolvedValue("Generated title")
		mocks.createArtifactTool.mockReturnValue("create-tool")
		mocks.updateArtifactTool.mockReturnValue("update-tool")
		mocks.requestSuggestionsTool.mockReturnValue("suggest-tool")
	})

	it("rejects cross-origin requests before session work", async () => {
		const response = await POST(chatRequest(requestData, "https://evil.example.com"))

		expect(response.status).toBe(403)
		expect(await response.json()).toMatchObject({ code: "forbidden:api:csrf_failed" })
		expect(mocks.getAppSession).not.toHaveBeenCalled()
	})

	it("maps missing sessions and rate limits to 401 and 429 responses", async () => {
		mocks.getAppSession.mockResolvedValue(null)
		const unauthorized = await requireChatSession()
		expect(unauthorized).toBeInstanceOf(Response)
		if (unauthorized instanceof Response) expect(unauthorized.status).toBe(401)

		mocks.checkRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
		const limited = await enforceChatRateLimit(userId)
		expect(limited?.status).toBe(429)
		expect(await limited?.json()).toMatchObject({ code: "rate_limit:chat:too_many_requests" })
	})

	it("rejects invalid JSON, invalid schemas, and unknown models", async () => {
		const invalidJson = await readChatRequest(chatRequest("{"))
		expect(invalidJson).toBeInstanceOf(Response)
		if (invalidJson instanceof Response) expect(invalidJson.status).toBe(400)

		const invalidSchema = await readChatRequest(
			chatRequest({ ...requestData, id: "not-a-uuid" }),
		)
		expect(invalidSchema).toBeInstanceOf(Response)
		if (invalidSchema instanceof Response) expect(invalidSchema.status).toBe(400)

		mocks.getAvailableModels.mockResolvedValue([])
		const unknownModel = await resolveChatRouteContext({ session, requestData })
		expect(unknownModel).toBeInstanceOf(Response)
		if (unknownModel instanceof Response) expect(unknownModel.status).toBe(400)
	})

	it("rejects owner mismatches before appending an existing chat message", async () => {
		mocks.getChatById.mockResolvedValue({ id: chatId, userId: "other-user" })

		const response = await resolveChatRouteContext({ session, requestData })

		expect(response).toBeInstanceOf(Response)
		if (response instanceof Response) expect(response.status).toBe(403)
		expect(mocks.saveMessages).not.toHaveBeenCalled()
	})

	it("sets up new guest chats and appends existing chat messages through persistence boundaries", async () => {
		const guestSession: AppSession = {
			user: { id: "44444444-4444-4444-8444-444444444444", type: "guest" },
		}
		const newContext = await resolveChatRouteContext({ session: guestSession, requestData })

		expect(newContext).not.toBeInstanceOf(Response)
		expect(mocks.ensureGuestUser).toHaveBeenCalledWith(guestSession.user.id)
		expect(mocks.createChatWithInitialMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				id: chatId,
				userId: guestSession.user.id,
				message: expect.objectContaining({ id: messageId }),
			}),
		)

		mocks.getChatById.mockResolvedValue({ id: chatId, userId })
		mocks.convertToUIMessages.mockReturnValue([
			{ id: "previous", role: "assistant", parts: [] },
		])
		const existingContext = await resolveChatRouteContext({ session, requestData })

		expect(existingContext).not.toBeInstanceOf(Response)
		expect(mocks.saveMessages).toHaveBeenCalledWith([
			expect.objectContaining({ id: messageId, chatId, role: "user" }),
		])
	})

	it("builds tools only for tool-enabled models", async () => {
		const withTools = await resolveChatRouteContext({ session, requestData })
		expect(withTools).not.toBeInstanceOf(Response)
		if (!(withTools instanceof Response)) expect(withTools.hasTools).toBe(true)

		const withoutTools = await resolveChatRouteContext({
			session,
			requestData: { ...requestData, selectedChatModel: noToolModel.id },
		})
		expect(withoutTools).not.toBeInstanceOf(Response)
		if (!(withoutTools instanceof Response)) expect(withoutTools.hasTools).toBe(false)

		expect(
			buildChatTools({
				hasTools: false,
				chatId,
				chatStream: { writeData: vi.fn() },
				session: session.user,
			}),
		).toBeUndefined()
		expect(
			buildChatTools({
				hasTools: true,
				chatId,
				chatStream: { writeData: vi.fn() },
				session: session.user,
			}),
		).toMatchObject({
			getWeather: mocks.getWeather,
			createArtifact: "create-tool",
			updateArtifact: "update-tool",
			requestSuggestions: "suggest-tool",
		})
	})

	it("returns a no-store stream and passes settings into prompt and provider options", async () => {
		const response = await POST(chatRequest(requestData))
		await response.text()

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(mocks.composeSystemPrompt).toHaveBeenCalledWith({
			settings: customSettings,
			hasTools: true,
		})
		expect(mocks.getProviderOptions).toHaveBeenCalledWith(
			toolModel.id,
			customSettings,
			toolModel,
		)
		expect(mocks.languageModel).toHaveBeenCalledWith(toolModel.id)
	})

	it("emits generated titles and persists assistant responses for new chats", async () => {
		const response = await POST(chatRequest(requestData))
		await response.text()

		expect(mocks.streamWrites).toContainEqual({
			type: "data-chat-title",
			data: "Generated title",
		})
		expect(mocks.streamWrites).toContainEqual({
			type: "data-usage",
			data: JSON.stringify({ inputTokens: 4, outputTokens: 2, totalTokens: 6 }),
		})
		expect(mocks.saveMessagesAndTouchChat).toHaveBeenCalledWith(
			expect.objectContaining({ chatId, title: "Generated title" }),
		)
	})

	it("recovers persistence failures and logs only when recovery also fails", async () => {
		mocks.saveMessagesAndTouchChat
			.mockRejectedValueOnce(new Error("down"))
			.mockRejectedValueOnce(new Error("down"))
			.mockRejectedValueOnce(new Error("down"))
			.mockResolvedValueOnce(undefined)

		await expect(
			persistChatResponse({
				chatId,
				userId,
				responseMessages: [
					{ id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
				],
				isNewChat: true,
				generatedTitle: "Recovered title",
			}),
		).rejects.toThrow("down")
		await expect(
			recoverChatPersistenceFailure({
				chatId,
				userId,
				isNewChat: true,
				generatedTitle: "Recovered title",
			}),
		).resolves.toBe(true)

		mocks.saveMessagesAndTouchChat.mockRejectedValue(new Error("still down"))
		await expect(
			recoverChatPersistenceFailure({ chatId, userId, isNewChat: false }),
		).resolves.toBe(false)
		expect(CHAT_PERSISTENCE_FAILURE_SIGNAL).toContain("could not be saved")
	})
})
