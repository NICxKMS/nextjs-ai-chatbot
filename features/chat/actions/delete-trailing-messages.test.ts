// Flow: chat-message-editing | Step: delete-trailing-action

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
	getAppSession: vi.fn(),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatOwnerId: vi.fn(),
}))

vi.mock("@/lib/data/message", () => ({
	deleteMessagesByIdAfter: vi.fn(),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import { getAppSession } from "@/lib/auth/session"
import { invalidateChat } from "@/lib/cache/revalidate"
import { getChatOwnerId } from "@/lib/data/chat"
import { deleteMessagesByIdAfter } from "@/lib/data/message"

const mockGetAppSession = getAppSession as ReturnType<typeof vi.fn>
const mockGetChatOwnerId = getChatOwnerId as ReturnType<typeof vi.fn>
const mockDeleteMessagesByIdAfter = deleteMessagesByIdAfter as ReturnType<typeof vi.fn>
const mockInvalidateChat = invalidateChat as ReturnType<typeof vi.fn>

const VALID_CHAT_ID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_MESSAGE_ID = "660e8400-e29b-41d4-a716-446655440000"
const USER_ID = "user-owner-123"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("deleteTrailingMessages", () => {
	it("returns validation error for invalid chatId", async () => {
		const result = await deleteTrailingMessages({
			chatId: "not-a-uuid",
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid input" },
		})
		expect(mockGetAppSession).not.toHaveBeenCalled()
	})

	it("returns validation error for invalid messageId", async () => {
		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: "not-a-uuid",
		})

		expect(result).toEqual({
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid input" },
		})
	})

	it("returns auth error when not authenticated", async () => {
		mockGetAppSession.mockResolvedValue(null)
		mockGetChatOwnerId.mockResolvedValue(USER_ID)

		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		})
	})

	it("returns not found when chat does not exist", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(null)

		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({
			success: false,
			error: { code: "not_found:chat:chat_not_found", message: "Chat not found" },
		})
	})

	it("returns forbidden when user does not own the chat", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue("other-user-456")

		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({
			success: false,
			error: {
				code: "forbidden:chat:owner_mismatch",
				message: "Not authorized to modify this chat",
			},
		})
	})

	it("deletes trailing messages and invalidates cache on success", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteMessagesByIdAfter.mockResolvedValue(undefined)

		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({ success: true, data: undefined })
		expect(mockDeleteMessagesByIdAfter).toHaveBeenCalledWith(VALID_CHAT_ID, VALID_MESSAGE_ID)
		expect(mockInvalidateChat).toHaveBeenCalledWith(VALID_CHAT_ID)
	})

	it("returns database error when deletion throws", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteMessagesByIdAfter.mockRejectedValue(new Error("DB down"))

		const result = await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(result).toEqual({
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete messages",
			},
		})
		expect(mockInvalidateChat).not.toHaveBeenCalled()
	})

	it("fetches session and chat in parallel", async () => {
		mockGetAppSession.mockResolvedValue({ user: { id: USER_ID } })
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockDeleteMessagesByIdAfter.mockResolvedValue(undefined)

		await deleteTrailingMessages({
			chatId: VALID_CHAT_ID,
			messageId: VALID_MESSAGE_ID,
		})

		expect(mockGetAppSession).toHaveBeenCalledOnce()
		expect(mockGetChatOwnerId).toHaveBeenCalledWith(VALID_CHAT_ID)
	})
})
