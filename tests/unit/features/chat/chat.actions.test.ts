import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { deleteChat } from "@/features/chat/actions/delete-chat"
import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import { createMockChat } from "@/tests/fixtures/chat"
import { createMockSession, TEST_OTHER_USER_ID, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockDeleteAllChatsData = vi.fn()
const mockDeleteChatData = vi.fn()
const mockGetChatById = vi.fn()
vi.mock("@/lib/data/chat", () => ({
	deleteAllChats: (...args: unknown[]) => mockDeleteAllChatsData(...args),
	deleteChat: (...args: unknown[]) => mockDeleteChatData(...args),
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
}))

const mockDeleteMessagesByIdAfter = vi.fn()
vi.mock("@/lib/data/message", () => ({
	deleteMessagesByIdAfter: (...args: unknown[]) => mockDeleteMessagesByIdAfter(...args),
}))

const mockInvalidateChatList = vi.fn()
const mockInvalidateChat = vi.fn()
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChatList: (...args: unknown[]) => mockInvalidateChatList(...args),
	invalidateChat: (...args: unknown[]) => mockInvalidateChat(...args),
}))

const CHAT_ID = "11111111-1111-4111-8111-111111111111"
const MESSAGE_ID = "22222222-2222-4222-8222-222222222222"

describe("chat server actions", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe("deleteAllChats", () => {
		it("deletes all chats for the authenticated user", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockDeleteAllChatsData.mockResolvedValue(undefined)

			const result = await deleteAllChats()

			expect(result).toEqual({ success: true, data: undefined })
			expect(mockDeleteAllChatsData).toHaveBeenCalledWith(TEST_USER_ID)
			expect(mockInvalidateChatList).toHaveBeenCalledWith(TEST_USER_ID)
		})

		it("returns unauthorized when there is no session", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const result = await deleteAllChats()

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("unauthorized:chat:auth_required")
			}
			expect(mockDeleteAllChatsData).not.toHaveBeenCalled()
			expect(mockInvalidateChatList).not.toHaveBeenCalled()
		})

		it("returns internal error when the data layer throws", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockDeleteAllChatsData.mockRejectedValue(new Error("db failed"))

			const result = await deleteAllChats()

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("internal_error:database:query_failed")
			}
			expect(mockInvalidateChatList).not.toHaveBeenCalled()
		})
	})

	describe("deleteChat", () => {
		it("deletes the chat when the authenticated user owns it", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			const chat = createMockChat({ id: CHAT_ID, userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)
			mockDeleteChatData.mockResolvedValue(undefined)

			const result = await deleteChat({ chatId: chat.id })

			expect(result).toEqual({ success: true, data: undefined })
			expect(mockDeleteChatData).toHaveBeenCalledWith(chat.id)
			expect(mockInvalidateChatList).toHaveBeenCalledWith(TEST_USER_ID)
		})

		it("returns unauthorized when there is no session", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const result = await deleteChat({ chatId: CHAT_ID })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("unauthorized:chat:auth_required")
			}
			expect(mockGetChatById).not.toHaveBeenCalled()
		})

		it("returns forbidden when an authenticated non-owner tries to delete", async () => {
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: {
						id: TEST_OTHER_USER_ID,
						type: "authenticated",
						email: "other@example.com",
					},
				}),
			)
			const chat = createMockChat({ id: CHAT_ID, userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)

			const result = await deleteChat({ chatId: chat.id })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
			}
			expect(mockDeleteChatData).not.toHaveBeenCalled()
			expect(mockInvalidateChatList).not.toHaveBeenCalled()
		})
	})

	describe("deleteTrailingMessages", () => {
		it("deletes trailing messages when the authenticated user owns the chat", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			const chat = createMockChat({ id: CHAT_ID, userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)
			mockDeleteMessagesByIdAfter.mockResolvedValue(undefined)

			const result = await deleteTrailingMessages({
				chatId: chat.id,
				messageId: MESSAGE_ID,
			})

			expect(result).toEqual({ success: true, data: undefined })
			expect(mockDeleteMessagesByIdAfter).toHaveBeenCalledWith(chat.id, MESSAGE_ID)
			expect(mockInvalidateChat).toHaveBeenCalledWith(chat.id)
		})

		it("returns unauthorized when there is no session", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const result = await deleteTrailingMessages({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("unauthorized:chat:auth_required")
			}
			expect(mockGetChatById).not.toHaveBeenCalled()
		})

		it("returns forbidden when an authenticated non-owner tries to delete messages", async () => {
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: {
						id: TEST_OTHER_USER_ID,
						type: "authenticated",
						email: "other@example.com",
					},
				}),
			)
			const chat = createMockChat({ id: CHAT_ID, userId: TEST_USER_ID })
			mockGetChatById.mockResolvedValue(chat)

			const result = await deleteTrailingMessages({
				chatId: chat.id,
				messageId: MESSAGE_ID,
			})

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
			}
			expect(mockDeleteMessagesByIdAfter).not.toHaveBeenCalled()
			expect(mockInvalidateChat).not.toHaveBeenCalled()
		})
	})
})
