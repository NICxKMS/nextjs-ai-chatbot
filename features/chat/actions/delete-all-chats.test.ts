// Flow: chat-deletion | Step: delete-all-action

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
	getAppSession: vi.fn(),
}))

vi.mock("@/lib/data/chat", () => ({
	deleteAllChats: vi.fn(),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChatList: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { getAppSession } from "@/lib/auth/session"
import { invalidateChatList } from "@/lib/cache/revalidate"
import { deleteAllChats as deleteAllChatsData } from "@/lib/data/chat"

const mockGetAppSession = getAppSession as ReturnType<typeof vi.fn>
const mockDeleteAllChatsData = deleteAllChatsData as ReturnType<typeof vi.fn>
const mockInvalidateChatList = invalidateChatList as ReturnType<typeof vi.fn>

const USER_ID = "user-123"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("deleteAllChats", () => {
	it("returns auth error when not authenticated", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const result = await deleteAllChats()

		expect(result).toEqual({
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		})
		expect(mockDeleteAllChatsData).not.toHaveBeenCalled()
	})

	it("deletes all chats and invalidates cache on success", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockDeleteAllChatsData.mockResolvedValue(undefined)

		const result = await deleteAllChats()

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockDeleteAllChatsData).toHaveBeenCalledWith(USER_ID)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(USER_ID)
	})

	it("returns database error when deletion throws", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockDeleteAllChatsData.mockRejectedValue(new Error("DB error"))

		const result = await deleteAllChats()

		expect(result).toEqual({
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete all chats",
			},
		})
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})
})
