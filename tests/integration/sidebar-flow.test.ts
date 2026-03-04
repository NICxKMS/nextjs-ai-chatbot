import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat } from "@/tests/fixtures/chat"
import {
	createMockSession,
	createMockUserPair,
	TEST_OTHER_USER_ID,
	TEST_USER_ID,
} from "@/tests/fixtures/user"

// ── Module mocks ────────────────────────────────────────────

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

// Data access — chat
const mockGetChatsByUserId = vi.fn()
const mockGetChatById = vi.fn()
const mockDeleteChat = vi.fn()

vi.mock("@/lib/data/chat", () => ({
	getChatsByUserId: (...args: unknown[]) => mockGetChatsByUserId(...args),
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

describe("Sidebar Flow — Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// ── GET /api/history — Data loading ──────────────────────

	describe("GET /api/history — sidebar data loading", () => {
		it("returns empty chat list for new user", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatsByUserId.mockResolvedValue({
				chats: [],
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")
			const response = await GET(new Request("http://localhost/api/history"))

			expect(response.status).toBe(200)
			const json = await response.json()
			expect(json.chats).toEqual([])
			expect(json.hasMore).toBe(false)
		})

		it("returns chat list ordered by most recent", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const chats = [
				createMockChat({
					id: "chat-newest",
					title: "Newest Chat",
					updatedAt: new Date("2026-01-03T00:00:00Z"),
				}),
				createMockChat({
					id: "chat-middle",
					title: "Middle Chat",
					updatedAt: new Date("2026-01-02T00:00:00Z"),
				}),
				createMockChat({
					id: "chat-oldest",
					title: "Oldest Chat",
					updatedAt: new Date("2026-01-01T00:00:00Z"),
				}),
			]

			mockGetChatsByUserId.mockResolvedValue({
				chats,
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")
			const response = await GET(new Request("http://localhost/api/history"))

			expect(response.status).toBe(200)
			const json = await response.json()
			expect(json.chats).toHaveLength(3)
			expect(json.chats[0].id).toBe("chat-newest")
		})

		it("supports pagination via limit and cursor", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			// First page
			mockGetChatsByUserId.mockResolvedValueOnce({
				chats: [createMockChat({ id: "chat-1" })],
				hasMore: true,
				nextCursor: "chat-1",
			})

			const { GET } = await import("@/app/api/history/route")
			const firstPage = await GET(new Request("http://localhost/api/history?limit=1"))

			const firstJson = await firstPage.json()
			expect(firstJson.chats).toHaveLength(1)
			expect(firstJson.hasMore).toBe(true)
			expect(firstJson.nextCursor).toBe("chat-1")

			// Second page
			mockGetChatsByUserId.mockResolvedValueOnce({
				chats: [createMockChat({ id: "chat-2" })],
				hasMore: false,
				nextCursor: undefined,
			})

			const secondPage = await GET(
				new Request("http://localhost/api/history?limit=1&cursor=chat-1"),
			)
			const secondJson = await secondPage.json()
			expect(secondJson.chats).toHaveLength(1)
			expect(secondJson.hasMore).toBe(false)
		})

		it("clamps limit between 1 and 100", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatsByUserId.mockResolvedValue({
				chats: [],
				hasMore: false,
				nextCursor: undefined,
			})

			const { GET } = await import("@/app/api/history/route")

			// Over 100 → clamped to 100
			await GET(new Request("http://localhost/api/history?limit=200"))
			expect(mockGetChatsByUserId).toHaveBeenLastCalledWith(TEST_USER_ID, {
				limit: 100,
				cursor: undefined,
			})

			// Under 1 → clamped to 1
			await GET(new Request("http://localhost/api/history?limit=0"))
			expect(mockGetChatsByUserId).toHaveBeenLastCalledWith(TEST_USER_ID, {
				limit: 1,
				cursor: undefined,
			})

			// NaN → default 20
			await GET(new Request("http://localhost/api/history?limit=abc"))
			expect(mockGetChatsByUserId).toHaveBeenLastCalledWith(TEST_USER_ID, {
				limit: 20,
				cursor: undefined,
			})
		})
	})

	// ── Pending chat operations (deleteChat from sidebar) ────

	describe("Pending chat operations — deleteChat", () => {
		it("owner can delete a chat from the sidebar", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const chat = createMockChat({ userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)
			mockDeleteChat.mockResolvedValue(undefined)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: chat.id })

			expect(result.success).toBe(true)
			expect(mockDeleteChat).toHaveBeenCalledWith(chat.id)
		})

		it("non-owner cannot delete another user's chat", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			const chat = createMockChat({ userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: chat.id })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
			}

			// Ensure delete was never called
			expect(mockDeleteChat).not.toHaveBeenCalled()
		})

		it("returns not_found when chat does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetChatById.mockResolvedValue(null)

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: crypto.randomUUID() })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("not_found:chat:chat_not_found")
			}
		})

		it("handles database failure gracefully", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const chat = createMockChat({ userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)
			mockDeleteChat.mockRejectedValue(new Error("DB connection lost"))

			const { deleteChat } = await import("@/features/chat/actions/delete-chat")
			const result = await deleteChat({ chatId: chat.id })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("internal_error:database:query_failed")
			}
		})
	})

	// ── Multi-user sidebar scenarios ─────────────────────────

	describe("Multi-user sidebar scenarios", () => {
		it("each user sees only their own chats", async () => {
			const { ownerSession, otherSession } = createMockUserPair()

			// Owner's chats
			const ownerChats = [
				createMockChat({ userId: TEST_USER_ID, title: "Owner Chat 1" }),
				createMockChat({ userId: TEST_USER_ID, title: "Owner Chat 2" }),
			]

			// Other user's chats
			const otherChats = [
				createMockChat({ userId: TEST_OTHER_USER_ID, title: "Other Chat 1" }),
			]

			const { GET } = await import("@/app/api/history/route")

			// Owner sees their chats
			mockGetAppSession.mockResolvedValue(ownerSession)
			mockGetChatsByUserId.mockResolvedValueOnce({
				chats: ownerChats,
				hasMore: false,
				nextCursor: undefined,
			})

			const ownerResponse = await GET(new Request("http://localhost/api/history"))
			const ownerJson = await ownerResponse.json()
			expect(ownerJson.chats).toHaveLength(2)
			expect(mockGetChatsByUserId).toHaveBeenCalledWith(TEST_USER_ID, expect.anything())

			// Other user sees their chats
			mockGetAppSession.mockResolvedValue(otherSession)
			mockGetChatsByUserId.mockResolvedValueOnce({
				chats: otherChats,
				hasMore: false,
				nextCursor: undefined,
			})

			const otherResponse = await GET(new Request("http://localhost/api/history"))
			const otherJson = await otherResponse.json()
			expect(otherJson.chats).toHaveLength(1)
			expect(mockGetChatsByUserId).toHaveBeenCalledWith(TEST_OTHER_USER_ID, expect.anything())
		})
	})

	// ── File upload auth boundary ────────────────────────────

	describe("POST /api/files/upload — auth boundary", () => {
		it("returns 401 when unauthenticated", async () => {
			mockGetAppSession.mockResolvedValue(null)

			// Mock the cache and blob dependencies for the upload route
			vi.mock("@/lib/cache/client", () => ({
				incr: vi.fn().mockResolvedValue(1),
				expire: vi.fn().mockResolvedValue(undefined),
			}))
			vi.mock("@/lib/cache/keys", () => ({
				rateLimitKeys: {
					rateLimitUpload: (userId: string) => `ratelimit:upload:${userId}`,
				},
			}))
			vi.mock("@vercel/blob", () => ({
				put: vi.fn(),
			}))

			const { POST } = await import("@/app/api/files/upload/route")

			const formData = new FormData()
			formData.append("file", new Blob(["test"], { type: "image/png" }), "test.png")

			const request = new Request("http://localhost/api/files/upload", {
				method: "POST",
				body: formData,
			})

			const response = await POST(request)
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:auth:no_session")
		})
	})

	// ── Error handling — database failures ───────────────────

	describe("Error handling — database failures", () => {
		it("GET /api/history returns 500 on data layer failure", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			mockGetChatsByUserId.mockRejectedValue(new Error("Connection terminated"))

			const { GET } = await import("@/app/api/history/route")
			const response = await GET(new Request("http://localhost/api/history"))

			expect(response.status).toBe(500)

			const json = await response.json()
			expect(json.code).toBe("internal_error:database:query_failed")
		})
	})
})
