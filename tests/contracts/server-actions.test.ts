import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	getChatOwnerId: vi.fn(),
	deleteChatData: vi.fn(),
	deleteAllChatsData: vi.fn(),
	deleteMessagesByIdAfter: vi.fn(),
	updateChatTitle: vi.fn(),
	updateChatVisibilityData: vi.fn(),
	getMessageById: vi.fn(),
	upsertVote: vi.fn(),
	checkRateLimit: vi.fn(),
	invalidateChat: vi.fn(),
	invalidateChatList: vi.fn(),
	invalidateVotes: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateChat: mocks.invalidateChat,
	invalidateChatList: mocks.invalidateChatList,
	invalidateVotes: mocks.invalidateVotes,
}))
vi.mock("@/lib/cache/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/data/chat", () => ({
	deleteAllChats: mocks.deleteAllChatsData,
	deleteChat: mocks.deleteChatData,
	getChatOwnerId: mocks.getChatOwnerId,
	updateChatTitle: mocks.updateChatTitle,
	updateChatVisibility: mocks.updateChatVisibilityData,
}))
vi.mock("@/lib/data/message", () => ({
	deleteMessagesByIdAfter: mocks.deleteMessagesByIdAfter,
	getMessageById: mocks.getMessageById,
}))
vi.mock("@/lib/data/vote", () => ({ upsertVote: mocks.upsertVote }))

import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { deleteChat } from "@/features/chat/actions/delete-chat"
import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import { renameChat } from "@/features/sidebar/actions/rename-chat"
import { updateChatVisibility } from "@/features/visibility/actions/update-visibility"
import { voteOnMessage } from "@/features/voting/actions/vote"

const chatId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"
const session = { user: { id: "33333333-3333-4333-8333-333333333333", type: "authenticated" } }

describe("server action contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.getChatOwnerId.mockResolvedValue(session.user.id)
		mocks.checkRateLimit.mockResolvedValue(true)
	})

	it("deleteChat enforces ownership and invalidates the chat list", async () => {
		await expect(deleteChat({ chatId })).resolves.toEqual({ success: true, data: undefined })
		expect(mocks.deleteChatData).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(session.user.id)

		mocks.getChatOwnerId.mockResolvedValue("other-user")
		await expect(deleteChat({ chatId })).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:chat:owner_mismatch" },
		})
	})

	it("deleteChat rejects unauthenticated users before deleting", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		await expect(deleteChat({ chatId })).resolves.toMatchObject({
			success: false,
			error: { code: "unauthorized:chat:auth_required" },
		})
		expect(mocks.deleteChatData).not.toHaveBeenCalled()
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("deleteChat returns database errors without invalidating", async () => {
		mocks.deleteChatData.mockRejectedValue(new Error("database down"))

		await expect(deleteChat({ chatId })).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("deleteAllChats operates only on the current session user", async () => {
		await expect(deleteAllChats()).resolves.toEqual({ success: true, data: undefined })
		expect(mocks.deleteAllChatsData).toHaveBeenCalledWith(session.user.id)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(session.user.id)
	})

	it("deleteAllChats invalidates only after a successful delete", async () => {
		mocks.deleteAllChatsData.mockRejectedValue(new Error("database down"))

		await expect(deleteAllChats()).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()

		mocks.deleteAllChatsData.mockResolvedValue(undefined)
		await expect(deleteAllChats()).resolves.toEqual({ success: true, data: undefined })
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(session.user.id)
	})

	it("deleteTrailingMessages validates input and invalidates the chat", async () => {
		await expect(deleteTrailingMessages({ chatId, messageId })).resolves.toEqual({
			success: true,
			data: undefined,
		})
		expect(mocks.deleteMessagesByIdAfter).toHaveBeenCalledWith(chatId, messageId)
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
	})

	it("deleteTrailingMessages rejects unauthenticated users before deleting or invalidating", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		await expect(deleteTrailingMessages({ chatId, messageId })).resolves.toMatchObject({
			success: false,
			error: { code: "unauthorized:chat:auth_required" },
		})
		expect(mocks.deleteMessagesByIdAfter).not.toHaveBeenCalled()
		expect(mocks.invalidateChat).not.toHaveBeenCalled()
	})

	it("deleteTrailingMessages returns database errors without invalidating", async () => {
		mocks.deleteMessagesByIdAfter.mockRejectedValue(new Error("database down"))

		await expect(deleteTrailingMessages({ chatId, messageId })).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.invalidateChat).not.toHaveBeenCalled()
	})

	it("renameChat updates title and invalidates both cache tags", async () => {
		await expect(renameChat({ chatId, title: "Renamed" })).resolves.toEqual({
			success: true,
			data: undefined,
		})
		expect(mocks.updateChatTitle).toHaveBeenCalledWith(chatId, "Renamed")
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(session.user.id)
	})

	it("renameChat validates title input before ownership lookup", async () => {
		await expect(renameChat({ chatId, title: "" })).resolves.toMatchObject({
			success: false,
			error: { code: "bad_request:validation:invalid_input" },
		})
		expect(mocks.getChatOwnerId).not.toHaveBeenCalled()
		expect(mocks.updateChatTitle).not.toHaveBeenCalled()
	})

	it("renameChat returns database errors without invalidating", async () => {
		mocks.updateChatTitle.mockRejectedValue(new Error("database down"))

		await expect(renameChat({ chatId, title: "Renamed" })).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.invalidateChat).not.toHaveBeenCalled()
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("updateChatVisibility persists enum visibility and invalidates both cache tags", async () => {
		await expect(updateChatVisibility({ chatId, visibility: "public" })).resolves.toEqual({
			success: true,
			data: undefined,
		})
		expect(mocks.updateChatVisibilityData).toHaveBeenCalledWith(chatId, "public")
		expect(mocks.invalidateChat).toHaveBeenCalledWith(chatId)
		expect(mocks.invalidateChatList).toHaveBeenCalledWith(session.user.id)
	})

	it("updateChatVisibility validates enum visibility and enforces ownership", async () => {
		await expect(updateChatVisibility({ chatId, visibility: "shared" })).resolves.toMatchObject(
			{
				success: false,
				error: { code: "bad_request:validation:invalid_input" },
			},
		)
		expect(mocks.updateChatVisibilityData).not.toHaveBeenCalled()

		mocks.getChatOwnerId.mockResolvedValue("other-user")
		await expect(
			updateChatVisibility({ chatId, visibility: "private" }),
		).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:chat:owner_mismatch" },
		})
		expect(mocks.updateChatVisibilityData).not.toHaveBeenCalled()
	})

	it("updateChatVisibility returns database errors without invalidating", async () => {
		mocks.updateChatVisibilityData.mockRejectedValue(new Error("database down"))

		await expect(updateChatVisibility({ chatId, visibility: "public" })).resolves.toMatchObject(
			{
				success: false,
				error: { code: "internal_error:database:query_failed" },
			},
		)
		expect(mocks.invalidateChat).not.toHaveBeenCalled()
		expect(mocks.invalidateChatList).not.toHaveBeenCalled()
	})

	it("voteOnMessage rejects guests and validates message membership", async () => {
		mocks.getAppSession.mockResolvedValue({ user: { id: "guest-id", type: "guest" } })
		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:auth:guest_restricted" },
		})

		mocks.getAppSession.mockResolvedValue(session)
		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId })
		await expect(voteOnMessage({ chatId, messageId, type: "down" })).resolves.toEqual({
			success: true,
			data: { messageId, type: "down" },
		})
		expect(mocks.upsertVote).toHaveBeenCalledWith({
			chatId,
			messageId,
			userId: session.user.id,
			isUpvoted: false,
		})
		expect(mocks.invalidateVotes).toHaveBeenCalledWith(chatId)
	})

	it("voteOnMessage rejects unauthenticated users before vote lookups", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "unauthorized:chat:auth_required" },
		})
		expect(mocks.getChatOwnerId).not.toHaveBeenCalled()
		expect(mocks.getMessageById).not.toHaveBeenCalled()
		expect(mocks.checkRateLimit).not.toHaveBeenCalled()
		expect(mocks.upsertVote).not.toHaveBeenCalled()
		expect(mocks.invalidateVotes).not.toHaveBeenCalled()
	})

	it("voteOnMessage rejects votes outside owned chats and rate limited votes", async () => {
		mocks.getChatOwnerId.mockResolvedValue("other-user")
		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId })

		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "forbidden:chat:owner_mismatch" },
		})
		expect(mocks.checkRateLimit).not.toHaveBeenCalled()
		expect(mocks.upsertVote).not.toHaveBeenCalled()

		mocks.getChatOwnerId.mockResolvedValue(session.user.id)
		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId: "other-chat" })
		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "not_found:vote:message_not_in_chat" },
		})

		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId })
		mocks.checkRateLimit.mockResolvedValue(false)
		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "rate_limit:vote:too_many_requests" },
		})
		expect(mocks.upsertVote).not.toHaveBeenCalled()
	})

	it("voteOnMessage returns database errors without invalidating votes", async () => {
		mocks.getMessageById.mockResolvedValue({ id: messageId, chatId })
		mocks.upsertVote.mockRejectedValue(new Error("database down"))

		await expect(voteOnMessage({ chatId, messageId, type: "up" })).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.upsertVote).toHaveBeenCalledWith({
			chatId,
			messageId,
			userId: session.user.id,
			isUpvoted: true,
		})
		expect(mocks.invalidateVotes).not.toHaveBeenCalled()
	})
})
