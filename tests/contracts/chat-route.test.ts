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
	createArtifactTool: vi.fn(),
	updateArtifactTool: vi.fn(),
	requestSuggestionsTool: vi.fn(),
	getWeather: vi.fn(),
	loggerError: vi.fn(),
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
vi.mock("@/lib/utils/logger", () => ({ logger: { error: mocks.loggerError } }))

import {
	buildChatTools,
	enforceChatRateLimit,
	persistChatResponse,
	readChatRequest,
	recoverChatPersistenceFailure,
	requireChatSession,
	resolveChatRouteContext,
	serializeUsage,
} from "@/features/chat/lib/chat-route"
import type { ChatRequest } from "@/features/chat/schemas/chat.schema"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import type { AppSession } from "@/lib/auth/session"
import type { ModelMetadata } from "@/lib/types/model.types"

const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"

const model: ModelMetadata = {
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

const requestData: ChatRequest = {
	id: chatId,
	message: {
		id: messageId,
		role: "user",
		parts: [{ type: "text", text: "Hello" }],
	},
	selectedChatModel: model.id,
	selectedVisibilityType: "private",
}

const session: AppSession = { user: { id: userId, type: "authenticated" } }

describe("chat route helper contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.checkRateLimit.mockResolvedValue(true)
		mocks.getAvailableModels.mockResolvedValue([model])
		mocks.getChatById.mockResolvedValue(null)
		mocks.getMessagesForChatRender.mockResolvedValue([])
		mocks.convertToUIMessages.mockReturnValue([])
		mocks.createArtifactTool.mockReturnValue("create-artifact-tool")
		mocks.updateArtifactTool.mockReturnValue("update-artifact-tool")
		mocks.requestSuggestionsTool.mockReturnValue("request-suggestions-tool")
		mocks.createChatWithInitialMessage.mockResolvedValue(undefined)
		mocks.saveMessages.mockResolvedValue(undefined)
		mocks.saveMessagesAndTouchChat.mockResolvedValue(undefined)
		mocks.ensureGuestUser.mockResolvedValue(undefined)
	})

	it("requires a session and returns the shared unauthorized response otherwise", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		const response = await requireChatSession()

		expect(response).toBeInstanceOf(Response)
		if (response instanceof Response) {
			expect(response.status).toBe(401)
			expect(await response.json()).toMatchObject({ code: "unauthorized:chat:auth_required" })
		}
	})

	it("maps chat rate-limit decisions to null or a 429 response", async () => {
		await expect(enforceChatRateLimit(userId)).resolves.toBeNull()

		mocks.checkRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
		const response = await enforceChatRateLimit(userId)

		expect(mocks.checkRateLimit).toHaveBeenLastCalledWith(
			"rate-limit-chat:user-1".replace("user-1", userId),
			20,
			60,
		)
		expect(response?.status).toBe(429)
		expect(await response?.json()).toMatchObject({ code: "rate_limit:chat:too_many_requests" })
	})

	it("parses valid chat requests and rejects invalid JSON", async () => {
		await expect(
			readChatRequest(
				new Request("https://app.example.com/api/chat", {
					method: "POST",
					body: JSON.stringify(requestData),
				}),
			),
		).resolves.toEqual(requestData)

		const invalid = await readChatRequest(
			new Request("https://app.example.com/api/chat", { method: "POST", body: "{" }),
		)

		expect(invalid).toBeInstanceOf(Response)
		if (invalid instanceof Response) {
			expect(invalid.status).toBe(400)
			expect(await invalid.json()).toMatchObject({
				code: "bad_request:api:invalid_request_body",
			})
		}
	})

	it("rejects non-object chat request bodies", async () => {
		const response = await readChatRequest(
			new Request("https://app.example.com/api/chat", {
				method: "POST",
				body: JSON.stringify([]),
			}),
		)

		expect(response).toBeInstanceOf(Response)
		if (response instanceof Response) {
			expect(response.status).toBe(400)
			expect(await response.json()).toMatchObject({
				code: "bad_request:api:invalid_request_body",
			})
		}
	})

	it("rejects unknown model ids before creating or appending messages", async () => {
		mocks.getAvailableModels.mockResolvedValue([])

		const response = await resolveChatRouteContext({ session, requestData })

		expect(response).toBeInstanceOf(Response)
		if (response instanceof Response) {
			expect(response.status).toBe(400)
			expect(await response.json()).toMatchObject({
				code: "bad_request:chat:invalid_model_id",
			})
		}
		expect(mocks.createChatWithInitialMessage).not.toHaveBeenCalled()
		expect(mocks.saveMessages).not.toHaveBeenCalled()
	})

	it("creates new guest chats with an ensured guest user and default settings", async () => {
		const guestSession: AppSession = { user: { id: "guest-1", type: "guest" } }

		const context = await resolveChatRouteContext({ session: guestSession, requestData })

		expect(context).not.toBeInstanceOf(Response)
		if (!(context instanceof Response)) {
			expect(context).toMatchObject({
				chatId,
				selectedChatModel: model.id,
				modelMetadata: model,
				effectiveSettings: DEFAULT_SETTINGS,
				hasTools: true,
				isNewChat: true,
				messageText: "Hello",
			})
			expect(context.allMessages).toEqual([
				{ id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
			])
		}
		expect(mocks.ensureGuestUser).toHaveBeenCalledWith("guest-1")
		expect(mocks.createChatWithInitialMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: chatId, userId: "guest-1", title: "New Chat" }),
		)
	})

	it("rejects owner mismatches before appending a user message", async () => {
		mocks.getChatById.mockResolvedValue({ id: chatId, userId: "other-user" })

		const response = await resolveChatRouteContext({ session, requestData })

		expect(response).toBeInstanceOf(Response)
		if (response instanceof Response) {
			expect(response.status).toBe(403)
			expect(await response.json()).toMatchObject({ code: "forbidden:chat:owner_mismatch" })
		}
		expect(mocks.saveMessages).not.toHaveBeenCalled()
	})

	it("does not ensure guest users when appending to existing guest chats", async () => {
		const guestSession: AppSession = { user: { id: "guest-1", type: "guest" } }
		mocks.getChatById.mockResolvedValue({ id: chatId, userId: "guest-1" })
		mocks.getMessagesForChatRender.mockResolvedValue([
			{ id: "old-message", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
		])
		mocks.convertToUIMessages.mockReturnValue([
			{ id: "old-message", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
		])

		const context = await resolveChatRouteContext({ session: guestSession, requestData })

		expect(context).not.toBeInstanceOf(Response)
		expect(mocks.ensureGuestUser).not.toHaveBeenCalled()
		expect(mocks.createChatWithInitialMessage).not.toHaveBeenCalled()
		expect(mocks.saveMessages).toHaveBeenCalledWith([
			{
				id: messageId,
				chatId,
				role: "user",
				parts: [{ type: "text", text: "Hello" }],
				attachments: [],
			},
		])
		if (!(context instanceof Response)) {
			expect(context.isNewChat).toBe(false)
			expect(context.allMessages).toEqual([
				{ id: "old-message", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
				{ id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
			])
		}
	})

	it("builds tool adapters only when the model has enabled tools", () => {
		const chatStream = { writeData: vi.fn() }

		expect(
			buildChatTools({ hasTools: false, chatId, chatStream, session: session.user }),
		).toBeUndefined()

		expect(
			buildChatTools({ hasTools: true, chatId, chatStream, session: session.user }),
		).toEqual({
			getWeather: mocks.getWeather,
			createArtifact: "create-artifact-tool",
			updateArtifact: "update-artifact-tool",
			requestSuggestions: "request-suggestions-tool",
		})
		expect(mocks.createArtifactTool).toHaveBeenCalledWith({
			session: { userId, isGuest: false },
			chatStream,
			chatId,
		})
	})

	it("serializes usage and persists assistant responses with title invalidation", async () => {
		const responseMessages: UIMessage[] = [
			{ id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
		]

		expect(
			serializeUsage({
				inputTokens: 10,
				outputTokens: 5,
				totalTokens: 15,
				reasoningTokens: 2,
				cachedInputTokens: 3,
				inputTokenDetails: {
					cacheReadTokens: 3,
					cacheWriteTokens: undefined,
					noCacheTokens: undefined,
				},
				outputTokenDetails: { reasoningTokens: 2, textTokens: undefined },
			}),
		).toBe(
			JSON.stringify({
				inputTokens: 10,
				outputTokens: 5,
				totalTokens: 15,
				reasoningTokens: 2,
				cachedInputTokens: 3,
			}),
		)

		await persistChatResponse({
			chatId,
			userId,
			responseMessages,
			isNewChat: true,
			generatedTitle: "Generated title",
		})

		expect(mocks.saveMessagesAndTouchChat).toHaveBeenCalledWith({
			chatId,
			messages: [
				{
					id: "assistant-1",
					chatId,
					role: "assistant",
					parts: [{ type: "text", text: "Hi" }],
					attachments: [],
				},
			],
			title: "Generated title",
		})
		expect(mocks.refreshChat).toHaveBeenCalledWith(chatId)
		expect(mocks.refreshChatList).toHaveBeenCalledWith(userId)
	})

	it("omits undefined optional usage fields", () => {
		expect(
			serializeUsage({
				inputTokens: 10,
				outputTokens: 5,
				totalTokens: 15,
				inputTokenDetails: {
					cacheReadTokens: undefined,
					cacheWriteTokens: undefined,
					noCacheTokens: undefined,
				},
				outputTokenDetails: {
					reasoningTokens: undefined,
					textTokens: undefined,
				},
			}),
		).toBe(JSON.stringify({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }))
	})

	it("retries persistence before refreshing caches for existing chats", async () => {
		vi.useFakeTimers()
		mocks.saveMessagesAndTouchChat
			.mockRejectedValueOnce(new Error("transient"))
			.mockResolvedValueOnce(undefined)

		const persistence = persistChatResponse({
			chatId,
			userId,
			responseMessages: [
				{ id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
			],
			isNewChat: false,
			generatedTitle: "Ignored title",
		})

		await vi.runAllTimersAsync()
		await persistence
		vi.useRealTimers()

		expect(mocks.saveMessagesAndTouchChat).toHaveBeenCalledTimes(2)
		expect(mocks.saveMessagesAndTouchChat).toHaveBeenLastCalledWith({
			chatId,
			messages: [
				{
					id: "assistant-1",
					chatId,
					role: "assistant",
					parts: [{ type: "text", text: "Hi" }],
					attachments: [],
				},
			],
			title: undefined,
		})
		expect(mocks.refreshChat).toHaveBeenCalledWith(chatId)
		expect(mocks.refreshChatList).toHaveBeenCalledWith(userId)
	})

	it("returns false when persistence recovery cannot write its fallback message", async () => {
		vi.useFakeTimers()
		mocks.saveMessagesAndTouchChat.mockRejectedValue(new Error("database down"))

		const recovered = recoverChatPersistenceFailure({
			chatId,
			userId,
			isNewChat: true,
			generatedTitle: "Generated title",
		})

		await vi.runAllTimersAsync()
		await expect(recovered).resolves.toBe(false)
		vi.useRealTimers()

		expect(mocks.saveMessagesAndTouchChat).toHaveBeenCalledTimes(3)
		expect(mocks.refreshChat).not.toHaveBeenCalled()
		expect(mocks.refreshChatList).not.toHaveBeenCalled()
	})
})
