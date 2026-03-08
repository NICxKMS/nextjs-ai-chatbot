// Flow: sidebar-rename | Step: rename-action
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

const mockGetAppSession = vi.fn()
const mockGetChatOwnerId = vi.fn()
const mockUpdateChatTitle = vi.fn()
const mockInvalidateChat = vi.fn()
const mockInvalidateChatList = vi.fn()

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatOwnerId: (...args: unknown[]) => mockGetChatOwnerId(...args),
	updateChatTitle: (...args: unknown[]) => mockUpdateChatTitle(...args),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: (...args: unknown[]) => mockInvalidateChat(...args),
	invalidateChatList: (...args: unknown[]) => mockInvalidateChatList(...args),
}))

// Import after mocks
const { renameChat } = await import("./rename-chat")

// ── Fixtures ─────────────────────────────────────────────────

const USER_ID = "user-abc-123"
const CHAT_ID = "550e8400-e29b-41d4-a716-446655440000"
const OTHER_USER = "user-xyz-789"

const validSession = {
	user: { id: USER_ID, type: "authenticated" as const, email: "test@example.com" },
}

// ── Tests ────────────────────────────────────────────────────

describe("renameChat", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAppSession.mockResolvedValue(validSession)
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockUpdateChatTitle.mockResolvedValue(undefined)
	})

	it("renames a chat the user owns", async () => {
		const result = await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockUpdateChatTitle).toHaveBeenCalledWith(CHAT_ID, "New Title")
		expect(mockInvalidateChat).toHaveBeenCalledWith(CHAT_ID)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(USER_ID)
	})

	it("rejects unauthenticated users", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const result = await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
		expect(mockUpdateChatTitle).not.toHaveBeenCalled()
	})

	it("rejects non-owner", async () => {
		mockGetChatOwnerId.mockResolvedValue(OTHER_USER)

		const result = await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
		expect(mockUpdateChatTitle).not.toHaveBeenCalled()
	})

	it("returns not_found when chat does not exist", async () => {
		mockGetChatOwnerId.mockResolvedValue(null)

		const result = await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:chat:chat_not_found")
		}
	})

	it("rejects empty title", async () => {
		const result = await renameChat({ chatId: CHAT_ID, title: "" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockGetChatOwnerId).not.toHaveBeenCalled()
	})

	it("rejects invalid chatId format", async () => {
		const result = await renameChat({ chatId: "not-a-uuid", title: "Valid Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("rejects title exceeding 200 characters", async () => {
		const result = await renameChat({ chatId: CHAT_ID, title: "x".repeat(201) })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("returns internal error when DB update fails", async () => {
		mockUpdateChatTitle.mockRejectedValue(new Error("DB connection lost"))

		const result = await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
	})

	it("does not invalidate cache when DB update fails", async () => {
		mockUpdateChatTitle.mockRejectedValue(new Error("DB error"))

		await renameChat({ chatId: CHAT_ID, title: "New Title" })

		expect(mockInvalidateChat).not.toHaveBeenCalled()
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})
})
