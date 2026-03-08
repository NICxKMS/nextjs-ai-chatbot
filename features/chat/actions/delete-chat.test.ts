// Flow: chat-deletion | Step: delete-action

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
	getAppSession: vi.fn(),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatOwnerId: vi.fn(),
	deleteChat: vi.fn(),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChatList: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { deleteChat } from "@/features/chat/actions/delete-chat"
import { getAppSession } from "@/lib/auth/session"
import { invalidateChatList } from "@/lib/cache/revalidate"
import { deleteChat as deleteChatData, getChatOwnerId } from "@/lib/data/chat"

const mockGetAppSession = getAppSession as ReturnType<typeof vi.fn>
const mockGetChatOwnerId = getChatOwnerId as ReturnType<typeof vi.fn>
const mockDeleteChatData = deleteChatData as ReturnType<typeof vi.fn>
const mockInvalidateChatList = invalidateChatList as ReturnType<typeof vi.fn>

const VALID_CHAT_ID = "550e8400-e29b-41d4-a716-446655440000"
const USER_ID = "user-owner-123"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("deleteChat", () => {
	it("returns validation error for invalid chat ID", async () => {
		const result = await deleteChat({ chatId: "not-a-uuid" })

		expect(result).toEqual({
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid chat ID" },
		})
		expect(mockGetAppSession).not.toHaveBeenCalled()
	})

	it("returns auth error when not authenticated", async () => {
		mockGetAppSession.mockResolvedValue(null)
		mockGetChatOwnerId.mockResolvedValue(USER_ID)

		const result = await deleteChat({ chatId: VALID_CHAT_ID })

		expect(result).toEqual({
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		})
	})

	it("returns not found when chat does not exist", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(null)

		const result = await deleteChat({ chatId: VALID_CHAT_ID })

		expect(result).toEqual({
			success: false,
			error: { code: "not_found:chat:chat_not_found", message: "Chat not found" },
		})
	})

	it("returns forbidden when user does not own the chat", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue("other-user-456")

		const result = await deleteChat({ chatId: VALID_CHAT_ID })

		expect(result).toEqual({
			success: false,
			error: {
				code: "forbidden:chat:owner_mismatch",
				message: "Not authorized to delete this chat",
			},
		})
	})

	it("deletes chat and invalidates cache on success", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteChatData.mockResolvedValue(undefined)

		const result = await deleteChat({ chatId: VALID_CHAT_ID })

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockDeleteChatData).toHaveBeenCalledWith(VALID_CHAT_ID)
		expect(mockInvalidateChatList).toHaveBeenCalledWith(USER_ID)
	})

	it("returns database error when deletion throws", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteChatData.mockRejectedValue(new Error("DB down"))

		const result = await deleteChat({ chatId: VALID_CHAT_ID })

		expect(result).toEqual({
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete chat",
			},
		})
		expect(mockInvalidateChatList).not.toHaveBeenCalled()
	})

	it("fetches session and chat in parallel", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteChatData.mockResolvedValue(undefined)

		await deleteChat({ chatId: VALID_CHAT_ID })

		// Both should be called (they execute via Promise.all)
		expect(mockGetAppSession).toHaveBeenCalledOnce()
		expect(mockGetChatOwnerId).toHaveBeenCalledWith(VALID_CHAT_ID)
	})
})
