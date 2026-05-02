import { beforeEach, describe, expect, it, vi } from "vitest"

type ExecutableTool<Input, Output> = {
	execute(input: Input): Promise<Output>
}

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	checkRateLimit: vi.fn(),
	getAvailableModels: vi.fn(),
	put: vi.fn(),
	getChatOwnerId: vi.fn(),
	getChatById: vi.fn(),
	getMessagesForChatRender: vi.fn(),
	saveMessages: vi.fn(),
	createChatWithInitialMessage: vi.fn(),
	saveMessagesAndTouchChat: vi.fn(),
	ensureGuestUser: vi.fn(),
	convertToUIMessages: vi.fn(),
	updateChatVisibilityData: vi.fn(),
	getMessageById: vi.fn(),
	upsertVote: vi.fn(),
	invalidateChat: vi.fn(),
	invalidateChatList: vi.fn(),
	invalidateVotes: vi.fn(),
}))

vi.mock("ai", () => ({ tool: <T extends object>(definition: T) => definition }))
vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@vercel/blob", () => ({ put: mocks.put }))
vi.mock("@/features/models/lib/models", () => ({ getAvailableModels: mocks.getAvailableModels }))
vi.mock("@/lib/data/chat", () => ({
	createChatWithInitialMessage: mocks.createChatWithInitialMessage,
	getChatById: mocks.getChatById,
	getChatOwnerId: mocks.getChatOwnerId,
	saveMessagesAndTouchChat: mocks.saveMessagesAndTouchChat,
	updateChatVisibility: mocks.updateChatVisibilityData,
}))
vi.mock("@/lib/data/message", () => ({
	getMessageById: mocks.getMessageById,
	getMessagesForChatRender: mocks.getMessagesForChatRender,
	saveMessages: mocks.saveMessages,
}))
vi.mock("@/lib/data/user", () => ({ ensureGuestUser: mocks.ensureGuestUser }))
vi.mock("@/features/chat/lib/message-utils", () => ({
	convertToUIMessages: mocks.convertToUIMessages,
}))
vi.mock("@/features/chat/lib/tools/create-artifact", () => ({
	createArtifactTool: vi.fn(),
}))
vi.mock("@/features/chat/lib/tools/update-artifact", () => ({
	updateArtifactTool: vi.fn(),
}))
vi.mock("@/features/chat/lib/tools/request-suggestions", () => ({
	requestSuggestionsTool: vi.fn(),
}))
vi.mock("@/lib/data/vote", () => ({ upsertVote: mocks.upsertVote }))
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: mocks.invalidateChat,
	invalidateChatList: mocks.invalidateChatList,
	invalidateVotes: mocks.invalidateVotes,
}))

import { POST as uploadFile } from "@/app/api/files/upload/route"
import { enforceChatRateLimit, resolveChatRouteContext } from "@/features/chat/lib/chat-route"
import { getWeather } from "@/features/chat/lib/tools/weather"
import type { ChatRequest } from "@/features/chat/schemas/chat.schema"
import { chatRequestSchema } from "@/features/chat/schemas/chat.schema"
import { settingsSchema } from "@/features/settings/schemas/settings.schema"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import { updateChatVisibility } from "@/features/visibility/actions/update-visibility"
import { updateVisibilitySchema } from "@/features/visibility/types/visibility.types"
import { voteOnMessage } from "@/features/voting/actions/vote"
import { voteSchema } from "@/features/voting/types/vote.types"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { getEnabledTools } from "@/lib/ai/tools"
import type { AppSession } from "@/lib/auth/session"
import type { ModelMetadata } from "@/lib/types/model.types"

const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"
const session: AppSession = { user: { id: userId, type: "authenticated" } }

const toolModel: ModelMetadata = {
	id: "google:gemini-2.5-flash",
	provider: "google",
	providerModelId: "gemini-2.5-flash",
	name: "Gemini",
	supportsToolCalling: true,
	supportsReasoning: true,
	modalities: { input: ["text", "image"], output: ["text"] },
	contextWindow: 1_000_000,
	maxOutputTokens: 8192,
	source: "static",
}

const chatRequestData: ChatRequest = {
	id: chatId,
	message: {
		id: messageId,
		role: "user",
		parts: [{ type: "text", text: "Hello" }],
	},
	selectedChatModel: toolModel.id,
	selectedVisibilityType: "private",
}

function uploadRequest(formData: FormData, origin = "https://app.example.com") {
	return new Request("https://app.example.com/api/files/upload", {
		method: "POST",
		headers: { origin },
		body: formData,
	})
}

function imageFile(name = "avatar.png") {
	return new File(
		[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
		name,
		{ type: "image/png" },
	)
}

describe("enhancement integration contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.checkRateLimit.mockResolvedValue(true)
		mocks.getAvailableModels.mockResolvedValue([toolModel])
		mocks.getChatOwnerId.mockResolvedValue(userId)
		mocks.getChatById.mockResolvedValue({ id: chatId, userId })
		mocks.getMessagesForChatRender.mockResolvedValue([])
		mocks.saveMessages.mockResolvedValue(undefined)
		mocks.createChatWithInitialMessage.mockResolvedValue(undefined)
		mocks.saveMessagesAndTouchChat.mockResolvedValue(undefined)
		mocks.ensureGuestUser.mockResolvedValue(undefined)
		mocks.convertToUIMessages.mockImplementation((messages: unknown) => messages)
		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId })
		mocks.updateChatVisibilityData.mockResolvedValue(undefined)
		mocks.upsertVote.mockResolvedValue({ chatId, messageId, userId, isUpvoted: true })
		mocks.put.mockResolvedValue({
			url: "https://blob.example.com/uploads/avatar.png",
			pathname: "uploads/avatar.png",
		})
	})

	it("weather tool supports coordinates and city lookup with cached city results", async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request) => {
			const requestUrl = String(url)
			if (requestUrl.includes("geocoding-api")) {
				return Response.json({ results: [{ latitude: 37.77, longitude: -122.42 }] })
			}
			return Response.json({ current: { temperature_2m: 18 } })
		})
		vi.stubGlobal("fetch", fetchMock)
		const tool = getWeather as unknown as ExecutableTool<
			{ latitude: number; longitude: number } | { city: string },
			Record<string, unknown>
		>

		await expect(tool.execute({ latitude: 1, longitude: 2 })).resolves.toMatchObject({
			current: { temperature_2m: 18 },
		})
		await expect(tool.execute({ city: "San Francisco" })).resolves.toMatchObject({
			cityName: "San Francisco",
		})
		await expect(tool.execute({ city: " san francisco " })).resolves.toMatchObject({
			cityName: "San Francisco",
		})
		expect(fetchMock).toHaveBeenCalledTimes(3)
	})

	it("settings, provider options, and model tool contracts compose from public schemas", () => {
		const settings = { ...DEFAULT_SETTINGS, temperature: 1.2, enableReasoning: true }

		expect(settingsSchema.safeParse(settings).success).toBe(true)
		expect(settingsSchema.safeParse({ ...settings, temperature: 3 }).success).toBe(false)
		expect(getProviderOptions(toolModel.id, settings, toolModel)).toEqual({
			temperature: 1.2,
			topP: DEFAULT_SETTINGS.topP,
			maxOutputTokens: DEFAULT_SETTINGS.maxOutputTokens,
			providerOptions: { google: { thinkingConfig: { thinkingBudget: -1 } } },
		})
		expect(getEnabledTools(toolModel)).toEqual([
			"getWeather",
			"createArtifact",
			"updateArtifact",
			"requestSuggestions",
		])
		expect(getEnabledTools({ ...toolModel, supportsToolCalling: false })).toEqual([])
	})

	it("chat schema accepts trusted upload file parts and rejects forged upload URLs", () => {
		const validRequest = {
			id: chatId,
			selectedChatModel: toolModel.id,
			selectedVisibilityType: "private",
			settings: DEFAULT_SETTINGS,
			message: {
				id: messageId,
				role: "user",
				parts: [
					{ type: "text", text: "Describe this" },
					{
						type: "file",
						mediaType: "image/png",
						name: "avatar.png",
						url: "https://abc.public.blob.vercel-storage.com/uploads/avatar.png",
					},
				],
			},
		}

		expect(chatRequestSchema.safeParse(validRequest).success).toBe(true)
		expect(
			chatRequestSchema.safeParse({
				...validRequest,
				message: {
					...validRequest.message,
					parts: [
						{
							type: "file",
							mediaType: "image/png",
							name: "avatar.png",
							url: "https://example.com/uploads/avatar.png",
						},
					],
				},
			}).success,
		).toBe(false)
	})

	it("visibility and vote enhancements validate, authorize, persist, and invalidate cache tags", async () => {
		expect(updateVisibilitySchema.safeParse({ chatId, visibility: "public" }).success).toBe(
			true,
		)
		expect(updateVisibilitySchema.safeParse({ chatId, visibility: "shared" }).success).toBe(
			false,
		)
		expect(voteSchema.safeParse({ chatId, messageId, type: "up" }).success).toBe(true)
		expect(voteSchema.safeParse({ chatId, messageId, type: "sideways" }).success).toBe(false)

		await expect(updateChatVisibility({ chatId, visibility: "public" })).resolves.toEqual({
			success: true,
			data: undefined,
		})
		expect(mocks.updateChatVisibilityData).toHaveBeenCalledWith(chatId, "public")
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(userId)

		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toEqual({
			success: true,
			data: { messageId, type: "up" },
		})
		expect(mocks.upsertVote).toHaveBeenCalledWith({
			chatId,
			messageId,
			userId,
			isUpvoted: true,
		})
		expect(mocks.invalidateVotes).toHaveBeenCalledWith(chatId)
	})

	it("upload route enforces origin/auth/rate-limit boundaries and returns trusted blob payloads", async () => {
		const formData = new FormData()
		formData.set("file", imageFile("unsafe name.png"))

		const forbidden = await uploadFile(uploadRequest(formData, "https://evil.example.com"))
		expect(forbidden.status).toBe(403)
		expect(mocks.getAppSession).not.toHaveBeenCalled()

		const allowed = await uploadFile(uploadRequest(formData))
		expect(allowed.status).toBe(200)
		expect(allowed.headers.get("Cache-Control")).toBe("no-store")
		expect(await allowed.json()).toEqual({
			url: "https://blob.example.com/uploads/avatar.png",
			pathname: "uploads/avatar.png",
			contentType: "image/png",
		})
		expect(mocks.put).toHaveBeenCalledWith("uploads/unsafe_name.png", expect.any(File), {
			access: "public",
			contentType: "image/png",
		})
	})

	it("chat route skips duplicate user messages already present in persisted history", async () => {
		mocks.getMessagesForChatRender.mockResolvedValue([
			{ id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
		])
		mocks.convertToUIMessages.mockReturnValue([
			{ id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
		])

		const context = await resolveChatRouteContext({ session, requestData: chatRequestData })

		expect(context).not.toBeInstanceOf(Response)
		expect(mocks.saveMessages).not.toHaveBeenCalled()
		if (!(context instanceof Response)) {
			expect(context.allMessages).toEqual([
				{ id: messageId, role: "user", parts: [{ type: "text", text: "Hello" }] },
			])
		}
	})

	it("chat route enforces the daily message limit before the per-minute chat limit", async () => {
		await expect(enforceChatRateLimit(userId)).resolves.toBeNull()

		expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(
			1,
			`rate-limit-daily:${userId}`,
			100,
			86_400,
		)
		expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(2, `rate-limit-chat:${userId}`, 20, 60)

		mocks.checkRateLimit.mockResolvedValueOnce(false)
		const dailyLimited = await enforceChatRateLimit(userId)

		expect(dailyLimited?.status).toBe(429)
		expect(await dailyLimited?.json()).toMatchObject({
			code: "rate_limit:chat:daily_limit_exceeded",
		})
		expect(mocks.checkRateLimit).toHaveBeenCalledTimes(3)
	})
})
