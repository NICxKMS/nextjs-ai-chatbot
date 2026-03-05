import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat } from "@/tests/fixtures/chat"
import { createMockSession, createMockUserPair, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockGetChatById = vi.fn()
const mockUpdateChatTitle = vi.fn()
vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
	updateChatTitle: (...args: unknown[]) => mockUpdateChatTitle(...args),
}))

const mockInvalidateChat = vi.fn()
const mockInvalidateChatList = vi.fn()
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: (...args: unknown[]) => mockInvalidateChat(...args),
	invalidateChatList: (...args: unknown[]) => mockInvalidateChatList(...args),
}))

describe("renameChat action", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockGetAppSession.mockResolvedValue(createMockSession())
		mockGetChatById.mockResolvedValue(createMockChat())
		mockUpdateChatTitle.mockResolvedValue(undefined)
	})

	it("returns unauthorized when no session exists", async () => {
		const { renameChat } = await import("@/features/sidebar/actions/rename-chat")
		mockGetAppSession.mockResolvedValue(null)

		const result = await renameChat({
			chatId: crypto.randomUUID(),
			title: "Renamed Chat",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
		expect(mockUpdateChatTitle).not.toHaveBeenCalled()
	})

	it("returns validation error for invalid input", async () => {
		const { renameChat } = await import("@/features/sidebar/actions/rename-chat")

		const result = await renameChat({ chatId: "invalid-uuid", title: "" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockGetChatById).not.toHaveBeenCalled()
	})

	it("returns forbidden when authenticated user does not own chat", async () => {
		const { renameChat } = await import("@/features/sidebar/actions/rename-chat")
		const { otherSession } = createMockUserPair()
		const chatId = crypto.randomUUID()

		mockGetAppSession.mockResolvedValue(otherSession)
		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))

		const result = await renameChat({ chatId, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
		expect(mockUpdateChatTitle).not.toHaveBeenCalled()
	})

	it("returns internal error when update fails", async () => {
		const { renameChat } = await import("@/features/sidebar/actions/rename-chat")
		const chatId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockUpdateChatTitle.mockRejectedValue(new Error("DB unavailable"))

		const result = await renameChat({ chatId, title: "New Title" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
		expect(mockInvalidateChat).not.toHaveBeenCalled()
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})

	it("renames chat and invalidates chat + chat-list cache for owner", async () => {
		const { renameChat } = await import("@/features/sidebar/actions/rename-chat")
		const chatId = crypto.randomUUID()

		mockGetAppSession.mockResolvedValue(createMockSession())
		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))

		const result = await renameChat({ chatId, title: "Renamed Chat" })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockUpdateChatTitle).toHaveBeenCalledWith(chatId, "Renamed Chat")
		expect(mockInvalidateChat).toHaveBeenCalledWith(chatId)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(TEST_USER_ID)
	})
})
