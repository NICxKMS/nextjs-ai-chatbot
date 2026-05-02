import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	getChatOwnerId: vi.fn(),
	updateChatTitle: vi.fn(),
	deleteChatData: vi.fn(),
	deleteAllChatsData: vi.fn(),
	deleteMessagesByIdAfter: vi.fn(),
	invalidateChat: vi.fn(),
	invalidateChatList: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: mocks.invalidateChat,
	invalidateChatList: mocks.invalidateChatList,
}))
vi.mock("@/lib/data/chat", () => ({
	deleteAllChats: mocks.deleteAllChatsData,
	deleteChat: mocks.deleteChatData,
	getChatOwnerId: mocks.getChatOwnerId,
	updateChatTitle: mocks.updateChatTitle,
}))
vi.mock("@/lib/data/message", () => ({
	deleteMessagesByIdAfter: mocks.deleteMessagesByIdAfter,
}))

import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { deleteChat } from "@/features/chat/actions/delete-chat"
import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import { renameChat } from "@/features/sidebar/actions/rename-chat"

const userId = "33333333-3333-4333-8333-333333333333"
const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const session = { user: { id: userId, type: "authenticated" } }

describe("sidebar server-boundary integration flow", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.getChatOwnerId.mockResolvedValue(userId)
		mocks.updateChatTitle.mockResolvedValue(undefined)
		mocks.deleteChatData.mockResolvedValue(undefined)
		mocks.deleteAllChatsData.mockResolvedValue(undefined)
		mocks.deleteMessagesByIdAfter.mockResolvedValue(undefined)
	})

	it("renames owned chats and invalidates both chat and sidebar history caches", async () => {
		await expect(renameChat({ chatId, title: "Renamed chat" })).resolves.toEqual({
			success: true,
			data: undefined,
		})

		expect(mocks.updateChatTitle).toHaveBeenCalledWith(chatId, "Renamed chat")
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(userId)
	})

	it("rejects sidebar rename before writes when input, auth, or ownership is invalid", async () => {
		await expect(
			renameChat({ chatId: "not-a-uuid", title: "Renamed chat" }),
		).resolves.toMatchObject({
			success: false,
			error: { code: "bad_request:validation:invalid_input" },
		})

		mocks.getAppSession.mockResolvedValueOnce(null)
		await expect(renameChat({ chatId, title: "Renamed chat" })).resolves.toMatchObject({
			success: false,
			error: { code: "unauthorized:chat:auth_required" },
		})

		mocks.getChatOwnerId.mockResolvedValueOnce("other-user")
		await expect(renameChat({ chatId, title: "Renamed chat" })).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:chat:owner_mismatch" },
		})

		expect(mocks.updateChatTitle).not.toHaveBeenCalled()
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("deletes a selected owned chat and refreshes the sidebar history boundary", async () => {
		await expect(deleteChat({ chatId })).resolves.toEqual({ success: true, data: undefined })

		expect(mocks.deleteChatData).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(userId)
	})

	it("blocks selected-chat deletion before writes for missing and mismatched owners", async () => {
		mocks.getChatOwnerId.mockResolvedValueOnce(null)
		await expect(deleteChat({ chatId })).resolves.toMatchObject({
			success: false,
			error: { code: "not_found:chat:chat_not_found" },
		})

		mocks.getChatOwnerId.mockResolvedValueOnce("other-user")
		await expect(deleteChat({ chatId })).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:chat:owner_mismatch" },
		})

		expect(mocks.deleteChatData).not.toHaveBeenCalled()
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("clears all sidebar chats for the authenticated user without requiring seeded rows", async () => {
		await expect(deleteAllChats()).resolves.toEqual({ success: true, data: undefined })

		expect(mocks.deleteAllChatsData).toHaveBeenCalledWith(userId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(userId)
	})

	it("preserves the edit-message server boundary by deleting trailing messages only for owners", async () => {
		await expect(deleteTrailingMessages({ chatId, messageId })).resolves.toEqual({
			success: true,
			data: undefined,
		})

		expect(mocks.deleteMessagesByIdAfter).toHaveBeenCalledWith(chatId, messageId)
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
	})

	it("returns action-level database errors instead of invalidating stale sidebar state", async () => {
		mocks.deleteAllChatsData.mockRejectedValueOnce(new Error("db down"))

		await expect(deleteAllChats()).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})

		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})
})
