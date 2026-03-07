import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat, createMockMessage } from "@/tests/fixtures/chat"
import {
	createMockSession,
	createMockUserPair,
	TEST_GUEST_ID,
	TEST_OTHER_USER_ID,
	TEST_USER_ID,
} from "@/tests/fixtures/user"
import { createMockTextModel } from "@/tests/mocks/ai"

const JSON_HEADERS = {
	"Content-Type": "application/json",
	origin: "http://localhost",
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function readResponseBody(response: Response): Promise<string> {
	const reader = response.body?.getReader()
	if (!reader) {
		return ""
	}

	const decoder = new TextDecoder()
	let result = ""

	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			result += decoder.decode()
			break
		}

		if (typeof value === "string") {
			result += value
			continue
		}

		result += decoder.decode(value, { stream: true })
	}

	return result
}

// ── Module mocks ────────────────────────────────────────────

// Auth session
const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

// Data access — chat
const mockGetChatById = vi.fn()
const mockCreateChatWithInitialMessage = vi.fn()
const mockGetChatsByUserId = vi.fn()
const mockSaveMessagesAndTouchChat = vi.fn()
const mockUpdateChatVisibility = vi.fn()

vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
	createChatWithInitialMessage: (...args: unknown[]) => mockCreateChatWithInitialMessage(...args),
	getChatsByUserId: (...args: unknown[]) => mockGetChatsByUserId(...args),
	saveMessagesAndTouchChat: (...args: unknown[]) => mockSaveMessagesAndTouchChat(...args),
	updateChatVisibility: (...args: unknown[]) => mockUpdateChatVisibility(...args),
}))

// Data access — messages
const mockGetMessagesForChatRender = vi.fn()
const mockSaveMessages = vi.fn()

vi.mock("@/lib/data/message", () => ({
	getMessagesForChatRender: (...args: unknown[]) => mockGetMessagesForChatRender(...args),
	saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
}))

// Cache revalidation
vi.mock("@/lib/cache/revalidate", () => ({
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
	invalidateChat: vi.fn(),
	invalidateChatList: vi.fn(),
}))

const mockIncr = vi.fn()
const mockExpire = vi.fn()
vi.mock("@/lib/cache/client", () => ({
	incr: (...args: unknown[]) => mockIncr(...args),
	expire: (...args: unknown[]) => mockExpire(...args),
}))

const mockEnsureGuestUser = vi.fn()
vi.mock("@/lib/data/user", () => ({
	ensureGuestUser: (...args: unknown[]) => mockEnsureGuestUser(...args),
}))

const mockGetAvailableModels = vi.fn()
vi.mock("@/features/models/lib/models", () => ({
	getAvailableModels: (...args: unknown[]) => mockGetAvailableModels(...args),
}))

vi.mock("@/features/artifacts/handlers", () => ({}))

// AI provider
const mockLanguageModel = vi.fn()
vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: (...args: unknown[]) => mockLanguageModel(...args),
	},
}))

// AI utilities
const mockGenerateTitle = vi.fn()
vi.mock("@/lib/ai/title", () => ({
	generateTitle: (...args: unknown[]) => mockGenerateTitle(...args),
}))

vi.mock("@/lib/ai/prompts", () => ({
	composeSystemPrompt: vi.fn().mockReturnValue("You are a helpful assistant."),
}))

vi.mock("@/lib/ai/provider-options", () => ({
	getProviderOptions: vi.fn().mockReturnValue({}),
}))

vi.mock("@/lib/ai/tools", () => ({
	getEnabledTools: vi.fn().mockReturnValue(["getWeather", "createArtifact", "updateArtifact"]),
}))

// ── Tests ───────────────────────────────────────────────────

describe("Chat Flow — Contract Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetMessagesForChatRender.mockResolvedValue([])
		mockSaveMessages.mockResolvedValue([createMockMessage()])
		mockCreateChatWithInitialMessage.mockResolvedValue(createMockChat())
		mockSaveMessagesAndTouchChat.mockResolvedValue(undefined)
		mockIncr.mockResolvedValue(1)
		mockExpire.mockResolvedValue(true)
		mockEnsureGuestUser.mockResolvedValue(undefined)
		mockGenerateTitle.mockResolvedValue("Generated Title")
		mockGetAvailableModels.mockResolvedValue([
			{
				id: "gpt-4o",
				provider: "openai",
				providerModelId: "gpt-4o",
				name: "GPT-4o",
				supportsToolCalling: true,
				supportsReasoning: false,
				modalities: { input: ["text"], output: ["text"] },
				contextWindow: 128_000,
				maxOutputTokens: 16_384,
				source: "static",
			},
		])
	})

	// ── POST /api/chat — Auth boundary ───────────────────────

	describe("POST /api/chat — route guards", () => {
		it("returns 403 when origin header is missing", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: crypto.randomUUID(),
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:api:csrf_failed")
		})
	})

	// ── POST /api/chat — Rate limiting ───────────────────────

	describe("POST /api/chat — rate limiting", () => {
		it("returns 429 when user exceeds chat rate limit", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockIncr.mockResolvedValue(21)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: crypto.randomUUID(),
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(429)

			const json = await response.json()
			expect(json.code).toBe("rate_limit:chat:too_many_requests")
		})

		it("continues chat flow when rate-limit backend is unavailable", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockIncr.mockResolvedValue(null)
			mockGetChatById.mockResolvedValue(createMockChat({ userId: TEST_USER_ID }))

			const model = createMockTextModel("Fallback works")
			mockLanguageModel.mockReturnValue(model)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: crypto.randomUUID(),
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)
			await readResponseBody(response)
			expect(mockExpire).not.toHaveBeenCalled()
		})
	})

	// ── POST /api/chat — Validation boundary ─────────────────

	describe("POST /api/chat — validation boundary", () => {
		it("returns 400 for invalid JSON body", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: "not-json",
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:api:invalid_request_body")
		})

		it("returns 400 for missing required fields", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({ id: "not-a-uuid" }),
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:api:invalid_request_body")
		})

		it("returns 400 for unknown model ID", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetAvailableModels.mockResolvedValueOnce([])

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: crypto.randomUUID(),
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "invalid-model",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:chat:invalid_model_id")
		})
	})

	// ── POST /api/chat — Ownership boundary ──────────────────

	describe("POST /api/chat — ownership boundary", () => {
		it("returns 403 when non-owner tries to continue a chat", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			// Chat belongs to the owner
			const existingChat = createMockChat({ userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(existingChat)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: existingChat.id,
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})

		it("allows owner to continue their own chat", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const existingChat = createMockChat({ userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(existingChat)

			// Set up mock AI model to return a simple response
			const model = createMockTextModel("Hello there!")
			mockLanguageModel.mockReturnValue(model)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: existingChat.id,
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			// Streaming response returns 200
			expect(response.status).toBe(200)
			await readResponseBody(response)
		})
	})

	// ── POST /api/chat — New chat creation ───────────────────

	describe("POST /api/chat — new chat creation", () => {
		it("creates a new chat with its first user message when chatId does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null) // new chat

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: chatId,
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)
			await readResponseBody(response)

			expect(mockCreateChatWithInitialMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					id: chatId,
					userId: TEST_USER_ID,
					title: "New Chat",
					model: "gpt-4o",
					visibility: "private",
					message: expect.objectContaining({
						chatId,
						role: "user",
						attachments: [],
					}),
				}),
			)
		})

		it("persists streamed assistant messages and updates chat activity after streaming", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()
			const userMessageId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: chatId,
					message: {
						id: userMessageId,
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const reader = response.body?.getReader()
			if (reader) {
				while (true) {
					const { done } = await reader.read()
					if (done) {
						break
					}
				}
			}

			expect(mockSaveMessagesAndTouchChat).toHaveBeenCalledTimes(1)

			const [persistedTurn] = mockSaveMessagesAndTouchChat.mock.calls.at(-1) as [
				{
					chatId: string
					title?: string
					messages: Array<{ id: string; role: string; chatId: string }>
				},
			]

			expect(persistedTurn).toEqual(
				expect.objectContaining({
					chatId,
					title: "Generated Title",
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: "assistant",
							chatId,
							attachments: [],
							id: expect.stringMatching(UUID_PATTERN),
						}),
					]),
				}),
			)
		})

		it("persists a recovery notice when assistant persistence fails after streaming", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)
			mockSaveMessagesAndTouchChat
				.mockRejectedValueOnce(new Error("assistant save failed"))
				.mockRejectedValueOnce(new Error("assistant save failed"))
				.mockRejectedValueOnce(new Error("assistant save failed"))
				.mockResolvedValueOnce(undefined)

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()
			const userMessageId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: chatId,
					message: {
						id: userMessageId,
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const reader = response.body?.getReader()
			if (reader) {
				while (true) {
					const { done } = await reader.read()
					if (done) {
						break
					}
				}
			}

			expect(mockSaveMessagesAndTouchChat).toHaveBeenCalledTimes(4)

			const recoveryCall = mockSaveMessagesAndTouchChat.mock.calls[3]?.[0] as {
				chatId: string
				messages: Array<{ role: string; parts: Array<{ type: string; text: string }> }>
			}

			expect(recoveryCall).toEqual(
				expect.objectContaining({
					chatId,
					messages: [
						expect.objectContaining({
							role: "assistant",
							parts: [
								expect.objectContaining({
									type: "text",
									text: expect.stringContaining("could not be saved"),
								}),
							],
						}),
					],
				}),
			)
		})

		it("does not wait for title generation before usage emission and stream completion", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)

			let resolveTitle: ((title: string) => void) | undefined
			mockGenerateTitle.mockImplementation(
				() =>
					new Promise<string>((resolve) => {
						resolveTitle = resolve
					}),
			)

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: chatId,
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const body = await Promise.race([
				readResponseBody(response),
				new Promise<string>((resolve) => {
					setTimeout(() => resolve("__timeout__"), 250)
				}),
			])

			expect(body).not.toBe("__timeout__")
			expect(body).toContain('"type":"data-usage"')
			expect(mockSaveMessagesAndTouchChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId,
					title: undefined,
				}),
			)

			resolveTitle?.("Generated Later")
		})

		it("streams an explicit error when persistence and recovery both fail", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)
			mockSaveMessagesAndTouchChat.mockRejectedValue(new Error("db offline"))

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: crypto.randomUUID(),
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const body = await readResponseBody(response)

			expect(body).toContain('"type":"data-error"')
			expect(body).toContain("could not be saved")
			expect(mockSaveMessagesAndTouchChat).toHaveBeenCalledTimes(6)
			expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

			consoleErrorSpy.mockRestore()
		})

		it("ensures guest users exist before creating their first chat", async () => {
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: { id: TEST_GUEST_ID, type: "guest", email: "guest@example.com" },
				}),
			)
			mockGetChatById.mockResolvedValue(null)

			const model = createMockTextModel("Hi guest")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					id: chatId,
					message: {
						id: crypto.randomUUID(),
						role: "user",
						parts: [{ type: "text", text: "Hello" }],
					},
					selectedChatModel: "gpt-4o",
					selectedVisibilityType: "private",
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)
			await readResponseBody(response)

			expect(mockEnsureGuestUser).toHaveBeenCalledWith(TEST_GUEST_ID)
			expect(mockCreateChatWithInitialMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					id: chatId,
					userId: TEST_GUEST_ID,
				}),
			)
		})
	})

	// ── GET /api/history — Auth + response ───────────────────

	describe("GET /api/history — HTTP boundary", () => {
		it("returns 401 when session is missing", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { GET } = await import("@/app/api/history/route")
			const request = new Request("http://localhost/api/history")

			const response = await GET(request)
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})

		it("returns paginated chat list for authenticated user", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const chats = [
				createMockChat({ id: "chat-1", title: "Chat 1" }),
				createMockChat({ id: "chat-2", title: "Chat 2" }),
			]
			mockGetChatsByUserId.mockResolvedValue({
				chats,
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")
			const request = new Request("http://localhost/api/history?limit=20")

			const response = await GET(request)
			expect(response.status).toBe(200)

			const json = await response.json()
			expect(json.chats).toHaveLength(2)
			expect(json.hasMore).toBe(false)
		})

		it("respects limit and cursor query params", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatsByUserId.mockResolvedValue({
				chats: [createMockChat()],
				hasMore: true,
				nextCursor: "next-cursor-id",
			})

			const { GET } = await import("@/app/api/history/route")
			const request = new Request("http://localhost/api/history?limit=1&cursor=some-cursor")

			const response = await GET(request)
			expect(response.status).toBe(200)

			const json = await response.json()
			expect(json.hasMore).toBe(true)
			expect(json.nextCursor).toBe("next-cursor-id")

			expect(mockGetChatsByUserId).toHaveBeenCalledWith(TEST_USER_ID, {
				limit: 1,
				cursor: "some-cursor",
			})
		})
	})

	// ── Multi-user: owner vs non-owner ───────────────────────

	describe("Multi-user scenarios — chat ownership", () => {
		it("owner can access their own chat history", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const ownerChats = [createMockChat({ userId: TEST_USER_ID })]
			mockGetChatsByUserId.mockResolvedValue({
				chats: ownerChats,
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")
			const response = await GET(new Request("http://localhost/api/history"))

			expect(response.status).toBe(200)
			const json = await response.json()
			expect(json.chats).toHaveLength(1)
		})

		it("non-owner sees only their own chats in history", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			// getChatsByUserId is filtered by userId at the data layer
			mockGetChatsByUserId.mockResolvedValue({
				chats: [],
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")
			const response = await GET(new Request("http://localhost/api/history"))

			expect(response.status).toBe(200)
			const json = await response.json()
			expect(json.chats).toHaveLength(0)

			// Verify it queries with the other user's ID
			expect(mockGetChatsByUserId).toHaveBeenCalledWith(TEST_OTHER_USER_ID, expect.anything())
		})
	})
})
