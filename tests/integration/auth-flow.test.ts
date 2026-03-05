import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createMockSession,
	createMockUserPair,
	TEST_GUEST_ID,
	TEST_OTHER_USER_ID,
	TEST_USER_ID,
} from "@/tests/fixtures/user"

// ── Module mocks ────────────────────────────────────────────

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

// Data access — chat (for deleteChat ownership checks)
const mockGetChatById = vi.fn()
const mockDeleteChat = vi.fn()

vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
	deleteChat: (...args: unknown[]) => mockDeleteChat(...args),
}))

// Cache revalidation
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChatList: vi.fn(),
	invalidateChat: vi.fn(),
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
}))

// ── Tests ───────────────────────────────────────────────────

describe("Auth Flow — Integration Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	// ── Session resolution scenarios ─────────────────────────

	describe("Session resolution", () => {
		it("returns authenticated session with user id and type", () => {
			const session = createMockSession()
			expect(session.user.id).toBe(TEST_USER_ID)
			expect(session.user.type).toBe("authenticated")
			expect(session.user.email).toBe("test@example.com")
		})

		it("supports guest session creation", () => {
			const guestSession = createMockSession({
				user: { id: TEST_GUEST_ID, type: "guest" },
			})
			expect(guestSession.user.id).toBe(TEST_GUEST_ID)
			expect(guestSession.user.type).toBe("guest")
		})

		it("supports multi-user fixture pair creation", () => {
			const { owner, other, ownerSession, otherSession } = createMockUserPair()
			expect(owner.id).toBe(TEST_USER_ID)
			expect(other.id).toBe(TEST_OTHER_USER_ID)
			expect(ownerSession.user.id).toBe(TEST_USER_ID)
			expect(otherSession.user.id).toBe(TEST_OTHER_USER_ID)
		})
	})

	// ── Auth guard patterns — route handlers ─────────────────

	describe("Auth guards — route handler pattern", () => {
		it("GET /api/history returns 401 for unauthenticated request", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { GET } = await import("@/app/api/history/route")
			const request = new Request("http://localhost/api/history")

			const response = await GET(request)
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})

		it("GET /api/artifact returns 401 for unauthenticated request", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact?id=some-uuid")

			const response = await GET(request)
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})

		it("POST /api/chat returns 401 for unauthenticated request", async () => {
			mockGetAppSession.mockResolvedValue(null)

			// Mock AI-related imports to avoid module resolution issues
			vi.mock("@/lib/ai/provider", () => ({
				myProvider: { languageModel: vi.fn() },
			}))
			vi.mock("@/lib/ai/title", () => ({
				generateTitle: vi.fn(),
			}))
			vi.mock("@/lib/ai/models", () => ({
				getModelById: vi.fn(),
			}))
			vi.mock("@/lib/ai/prompts", () => ({
				composeSystemPrompt: vi.fn(),
			}))
			vi.mock("@/lib/ai/provider-options", () => ({
				getProviderOptions: vi.fn(),
			}))
			vi.mock("@/lib/ai/tools", () => ({
				getEnabledTools: vi.fn(),
			}))
			vi.mock("@/lib/data/message", () => ({
				getMessagesByChatId: vi.fn(),
				saveMessages: vi.fn(),
			}))

			const { POST } = await import("@/app/api/chat/route")
			const request = new Request("http://localhost/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					origin: "http://localhost",
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
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})
	})

	// ── Auth guards — server action pattern (deleteChat) ─────

	describe("Auth guards — server action pattern", () => {
		it("deleteChat returns unauthorized error when session is null", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: crypto.randomUUID() })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("unauthorized:chat:auth_required")
			}
		})

		it("deleteChat returns forbidden when non-owner attempts deletion", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			// Chat belongs to the owner
			const chatId = crypto.randomUUID()
			mockGetChatById.mockResolvedValue({
				id: chatId,
				userId: TEST_USER_ID,
				title: "Owner Chat",
				visibility: "private",
			})

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
			}
		})

		it("deleteChat succeeds for the owner", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const chatId = crypto.randomUUID()
			mockGetChatById.mockResolvedValue({
				id: chatId,
				userId: TEST_USER_ID,
				title: "My Chat",
				visibility: "private",
			})
			mockDeleteChat.mockResolvedValue(undefined)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId })

			expect(result.success).toBe(true)
			expect(mockDeleteChat).toHaveBeenCalledWith(chatId)
		})

		it("deleteChat returns not found when chat does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: crypto.randomUUID() })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("not_found:chat:chat_not_found")
			}
		})
	})

	// ── Multi-user auth scenarios ────────────────────────────

	describe("Multi-user auth scenarios", () => {
		it("owner vs non-owner: owner can delete, non-owner cannot", async () => {
			const { ownerSession, otherSession } = createMockUserPair()

			const chatId = crypto.randomUUID()
			const chatData = {
				id: chatId,
				userId: TEST_USER_ID,
				title: "Shared Chat",
				visibility: "private",
			}

			// Non-owner attempt → forbidden
			mockGetAppSession.mockResolvedValue(otherSession)
			mockGetChatById.mockResolvedValue(chatData)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const failResult = await deleteChat({ chatId })
			expect(failResult.success).toBe(false)
			if (!failResult.success) {
				expect(failResult.error.code).toBe("forbidden:chat:owner_mismatch")
			}

			// Owner attempt → success
			mockGetAppSession.mockResolvedValue(ownerSession)
			mockGetChatById.mockResolvedValue(chatData)
			mockDeleteChat.mockResolvedValue(undefined)

			const successResult = await deleteChat({ chatId })
			expect(successResult.success).toBe(true)
		})

		it("guest session has 'guest' type and can be distinguished", () => {
			const guestSession = createMockSession({
				user: { id: TEST_GUEST_ID, type: "guest" },
			})

			const authSession = createMockSession()

			expect(guestSession.user.type).toBe("guest")
			expect(authSession.user.type).toBe("authenticated")

			// Guest IDs follow the prefix convention
			expect(guestSession.user.id).toMatch(/^guest:/)
			expect(authSession.user.id).not.toMatch(/^guest:/)
		})
	})

	// ── Validation guard patterns ────────────────────────────

	describe("Validation guards", () => {
		it("deleteChat rejects invalid chatId format", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: "not-a-uuid" })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("bad_request:validation:invalid_input")
			}
		})
	})
})
