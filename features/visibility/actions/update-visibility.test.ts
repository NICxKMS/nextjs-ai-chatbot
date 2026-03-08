// Flow: visibility-update | Step: visibility-action
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

const mockGetAppSession = vi.fn()
const mockGetChatOwnerId = vi.fn()
const mockUpdateVisibilityInDb = vi.fn()
const mockInvalidateChat = vi.fn()
const mockInvalidateChatList = vi.fn()

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatOwnerId: (...args: unknown[]) => mockGetChatOwnerId(...args),
	updateChatVisibility: (...args: unknown[]) => mockUpdateVisibilityInDb(...args),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: (...args: unknown[]) => mockInvalidateChat(...args),
	invalidateChatList: (...args: unknown[]) => mockInvalidateChatList(...args),
}))

// Import after mocks
const { updateChatVisibility } = await import("./update-visibility")

// ── Fixtures ─────────────────────────────────────────────────

const USER_ID = "user-abc-123"
const CHAT_ID = "550e8400-e29b-41d4-a716-446655440000"
const OTHER_USER = "user-xyz-789"

const validSession = {
	user: { id: USER_ID, type: "authenticated" as const, email: "test@example.com" },
}

// ── Tests ────────────────────────────────────────────────────

describe("updateChatVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAppSession.mockResolvedValue(validSession)
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockUpdateVisibilityInDb.mockResolvedValue(undefined)
	})

	it("updates visibility for the chat owner", async () => {
		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockUpdateVisibilityInDb).toHaveBeenCalledWith(CHAT_ID, "public")
		expect(mockInvalidateChat).toHaveBeenCalledWith(CHAT_ID)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(USER_ID)
	})

	it("allows setting visibility to private", async () => {
		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "private" })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockUpdateVisibilityInDb).toHaveBeenCalledWith(CHAT_ID, "private")
	})

	it("rejects unauthenticated users", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
		expect(mockUpdateVisibilityInDb).not.toHaveBeenCalled()
	})

	it("rejects non-owner", async () => {
		mockGetChatOwnerId.mockResolvedValue(OTHER_USER)

		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
		expect(mockUpdateVisibilityInDb).not.toHaveBeenCalled()
	})

	it("returns not_found when chat does not exist", async () => {
		mockGetChatOwnerId.mockResolvedValue(null)

		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:chat:chat_not_found")
		}
	})

	it("rejects invalid chatId format", async () => {
		const result = await updateChatVisibility({
			chatId: "not-a-uuid",
			visibility: "public",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("rejects invalid visibility value", async () => {
		const result = await updateChatVisibility({
			chatId: CHAT_ID,
			visibility: "unlisted",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("rejects missing visibility", async () => {
		const result = await updateChatVisibility({ chatId: CHAT_ID })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("returns internal error when DB update fails", async () => {
		mockUpdateVisibilityInDb.mockRejectedValue(new Error("DB connection lost"))

		const result = await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
	})

	it("does not invalidate cache when DB update fails", async () => {
		mockUpdateVisibilityInDb.mockRejectedValue(new Error("DB error"))

		await updateChatVisibility({ chatId: CHAT_ID, visibility: "public" })

		expect(mockInvalidateChat).not.toHaveBeenCalled()
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})
})
