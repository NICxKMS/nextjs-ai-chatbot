import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat } from "@/tests/fixtures/chat"
import {
	createMockSession,
	createMockUserPair,
	TEST_OTHER_USER_ID,
	TEST_USER_ID,
} from "@/tests/fixtures/user"
import { createMockTextModel } from "@/tests/mocks/ai"

// ── Module mocks ────────────────────────────────────────────

// Auth session
const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

// Data access — chat
const mockGetChatById = vi.fn()
const mockCreateChat = vi.fn()
const mockGetChatsByUserId = vi.fn()
const mockUpdateChatTitle = vi.fn()
const mockUpdateChatVisibility = vi.fn()

vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
	createChat: (...args: unknown[]) => mockCreateChat(...args),
	getChatsByUserId: (...args: unknown[]) => mockGetChatsByUserId(...args),
	updateChatTitle: (...args: unknown[]) => mockUpdateChatTitle(...args),
	updateChatVisibility: (...args: unknown[]) => mockUpdateChatVisibility(...args),
}))

// Data access — messages
const mockGetMessagesByChatId = vi.fn()
const mockSaveMessages = vi.fn()

vi.mock("@/lib/data/message", () => ({
	getMessagesByChatId: (...args: unknown[]) => mockGetMessagesByChatId(...args),
	saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
}))

// Cache revalidation
vi.mock("@/lib/cache/revalidate", () => ({
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
	invalidateChat: vi.fn(),
	invalidateChatList: vi.fn(),
}))

// AI provider
const mockLanguageModel = vi.fn()
vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: (...args: unknown[]) => mockLanguageModel(...args),
	},
}))

// AI utilities
vi.mock("@/lib/ai/title", () => ({
	generateTitle: vi.fn().mockResolvedValue("Generated Title"),
}))

vi.mock("@/lib/ai/models", () => ({
	getModelById: vi.fn().mockReturnValue({
		id: "gpt-4o",
		name: "GPT-4o",
		provider: "openai",
		supportsReasoning: false,
		supportsTools: true,
	}),
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

describe("Chat Flow — Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetMessagesByChatId.mockResolvedValue([])
		mockSaveMessages.mockResolvedValue(undefined)
		mockCreateChat.mockResolvedValue(undefined)
	})

	// ── POST /api/chat — Auth boundary ───────────────────────

	describe("POST /api/chat — auth boundary", () => {
		it("returns 401 when session is missing", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})
	})

	// ── POST /api/chat — Validation boundary ─────────────────

	describe("POST /api/chat — validation boundary", () => {
		it("returns 400 for invalid JSON body", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: "not-a-uuid" }),
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:api:invalid_request_body")
		})

		it("returns 400 for unknown model ID", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			// Override getModelById to return null for unknown model
			const { getModelById } = await import("@/lib/ai/models")
			vi.mocked(getModelById).mockReturnValueOnce(undefined)

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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
				headers: { "Content-Type": "application/json" },
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
				headers: { "Content-Type": "application/json" },
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
		})
	})

	// ── POST /api/chat — New chat creation ───────────────────

	describe("POST /api/chat — new chat creation", () => {
		it("creates a new chat when chatId does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null) // new chat

			const model = createMockTextModel("Hi!")
			mockLanguageModel.mockReturnValue(model)

			const chatId = crypto.randomUUID()

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
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

			// Verify createChat was called for the new chat
			expect(mockCreateChat).toHaveBeenCalledWith(
				expect.objectContaining({
					id: chatId,
					userId: TEST_USER_ID,
					title: "New Chat",
					model: "gpt-4o",
					visibility: "private",
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
