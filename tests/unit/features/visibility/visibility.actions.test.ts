import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat } from "@/tests/fixtures/chat"
import { createMockSession, createMockUserPair, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockGetChatById = vi.fn()
const mockUpdateChatVisibility = vi.fn()
vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
	updateChatVisibility: (...args: unknown[]) => mockUpdateChatVisibility(...args),
}))

const mockInvalidateChat = vi.fn()
const mockInvalidateChatList = vi.fn()
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: (...args: unknown[]) => mockInvalidateChat(...args),
	invalidateChatList: (...args: unknown[]) => mockInvalidateChatList(...args),
}))

describe("updateChatVisibility action", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockGetAppSession.mockResolvedValue(createMockSession())
		mockGetChatById.mockResolvedValue(createMockChat())
		mockUpdateChatVisibility.mockResolvedValue(undefined)
	})

	it("returns unauthorized when session is missing", async () => {
		const { updateChatVisibility } = await import(
			"@/features/visibility/actions/update-visibility"
		)
		mockGetAppSession.mockResolvedValue(null)

		const result = await updateChatVisibility({
			chatId: crypto.randomUUID(),
			visibility: "private",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
		expect(mockGetChatById).not.toHaveBeenCalled()
	})

	it("returns validation error for malformed visibility payload", async () => {
		const { updateChatVisibility } = await import(
			"@/features/visibility/actions/update-visibility"
		)

		const result = await updateChatVisibility({
			chatId: "bad-id",
			visibility: "friends-only",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockGetChatById).not.toHaveBeenCalled()
	})

	it("returns forbidden when user is not the owner", async () => {
		const { updateChatVisibility } = await import(
			"@/features/visibility/actions/update-visibility"
		)
		const { otherSession } = createMockUserPair()
		const chatId = crypto.randomUUID()

		mockGetAppSession.mockResolvedValue(otherSession)
		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))

		const result = await updateChatVisibility({ chatId, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
		expect(mockUpdateChatVisibility).not.toHaveBeenCalled()
	})

	it("returns internal error when data update fails", async () => {
		const { updateChatVisibility } = await import(
			"@/features/visibility/actions/update-visibility"
		)
		const chatId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockUpdateChatVisibility.mockRejectedValue(new Error("DB failed"))

		const result = await updateChatVisibility({ chatId, visibility: "public" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
		expect(mockInvalidateChat).not.toHaveBeenCalled()
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})

	it("updates visibility and invalidates cache for owner", async () => {
		const { updateChatVisibility } = await import(
			"@/features/visibility/actions/update-visibility"
		)
		const chatId = crypto.randomUUID()

		mockGetAppSession.mockResolvedValue(createMockSession())
		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))

		const result = await updateChatVisibility({ chatId, visibility: "public" })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockUpdateChatVisibility).toHaveBeenCalledWith(chatId, "public")
		expect(mockInvalidateChat).toHaveBeenCalledWith(chatId)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(TEST_USER_ID)
	})
})
