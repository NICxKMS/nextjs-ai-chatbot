import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { NewMessage, NewSuggestion } from "@/lib/types/models.types"
import { createMockArtifact } from "@/tests/fixtures/artifact"
import { createMockChat, createMockMessage } from "@/tests/fixtures/chat"
import { createMockUser, TEST_USER_ID } from "@/tests/fixtures/user"

const mockDb = {
	query: {
		chats: {
			findFirst: vi.fn(),
		},
	},
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
}

vi.mock("@/lib/db/client", () => ({ db: mockDb }))

let chatData: typeof import("@/lib/data/chat")
let messageData: typeof import("@/lib/data/message")
let artifactData: typeof import("@/lib/data/artifact")
let userData: typeof import("@/lib/data/user")
let voteData: typeof import("@/lib/data/vote")
let suggestionData: typeof import("@/lib/data/suggestion")

beforeAll(async () => {
	;[chatData, messageData, artifactData, userData, voteData, suggestionData] = await Promise.all([
		import("@/lib/data/chat"),
		import("@/lib/data/message"),
		import("@/lib/data/artifact"),
		import("@/lib/data/user"),
		import("@/lib/data/vote"),
		import("@/lib/data/suggestion"),
	])
})

beforeEach(() => {
	vi.resetAllMocks()
})

function mockSelectWhereResult(result: unknown) {
	const chain = {
		from: vi.fn(),
		where: vi.fn(),
	}

	chain.from.mockReturnValue(chain)
	chain.where.mockResolvedValue(result)
	mockDb.select.mockReturnValue(chain)

	return chain
}

function mockSelectOrderByResult(result: unknown) {
	const chain = {
		from: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
	}

	chain.from.mockReturnValue(chain)
	chain.where.mockReturnValue(chain)
	chain.orderBy.mockResolvedValue(result)
	mockDb.select.mockReturnValue(chain)

	return chain
}

function mockSelectLimitResult(result: unknown) {
	const chain = {
		from: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
	}

	chain.from.mockReturnValue(chain)
	chain.where.mockReturnValue(chain)
	chain.orderBy.mockReturnValue(chain)
	chain.limit.mockResolvedValue(result)
	mockDb.select.mockReturnValue(chain)

	return chain
}

function mockInsertReturning(result: unknown) {
	const chain = {
		values: vi.fn(),
		returning: vi.fn(),
		onConflictDoNothing: vi.fn(),
		onConflictDoUpdate: vi.fn(),
	}

	chain.values.mockReturnValue(chain)
	chain.returning.mockResolvedValue(result)
	chain.onConflictDoNothing.mockResolvedValue(undefined)
	chain.onConflictDoUpdate.mockReturnValue(chain)
	mockDb.insert.mockReturnValue(chain)

	return chain
}

function mockUpdateWhere() {
	const chain = {
		set: vi.fn(),
		where: vi.fn(),
		returning: vi.fn(),
	}

	chain.set.mockReturnValue(chain)
	chain.where.mockResolvedValue(undefined)
	chain.returning.mockResolvedValue([])
	mockDb.update.mockReturnValue(chain)

	return chain
}

function mockUpdateReturning(result: unknown) {
	const chain = {
		set: vi.fn(),
		where: vi.fn(),
		returning: vi.fn(),
	}

	chain.set.mockReturnValue(chain)
	chain.where.mockReturnValue(chain)
	chain.returning.mockResolvedValue(result)
	mockDb.update.mockReturnValue(chain)

	return chain
}

function mockDeleteWhere() {
	const chain = {
		where: vi.fn(),
	}

	chain.where.mockResolvedValue(undefined)
	mockDb.delete.mockReturnValue(chain)

	return chain
}

async function expectInternalError(promise: Promise<unknown>, message: string) {
	await expect(promise).rejects.toMatchObject({
		name: "AppError",
		code: "internal_error:database:query_failed",
		message,
	})
}

describe("lib/data/chat", () => {
	it("getChatById returns a chat when found", async () => {
		const chat = createMockChat({ id: "11111111-1111-4111-8111-111111111111" })
		mockDb.query.chats.findFirst.mockResolvedValue(chat)

		const result = await chatData.getChatById(chat.id)

		expect(result).toEqual(chat)
		expect(mockDb.query.chats.findFirst).toHaveBeenCalledTimes(1)
	})

	it("getChatById returns null when not found", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(undefined)

		const result = await chatData.getChatById("missing-chat")

		expect(result).toBeNull()
	})

	it("getChatById handles undefined input and returns null", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(undefined)

		const result = await chatData.getChatById(undefined as unknown as string)

		expect(result).toBeNull()
		expect(mockDb.query.chats.findFirst).toHaveBeenCalledTimes(1)
	})

	it("getChatById wraps unexpected DB errors", async () => {
		mockDb.query.chats.findFirst.mockRejectedValue(new Error("db unavailable"))

		await expectInternalError(chatData.getChatById("chat-1"), "Failed to get chat")
	})

	it("getChatsByUserId applies cursor pagination and returns nextCursor", async () => {
		const cursorDate = new Date("2026-01-02T00:00:00Z")
		const chat1 = createMockChat({
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			updatedAt: new Date("2026-01-03T00:00:00Z"),
		})
		const chat2 = createMockChat({
			id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			updatedAt: new Date("2026-01-02T00:00:00Z"),
		})
		const chat3 = createMockChat({
			id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			updatedAt: new Date("2026-01-01T00:00:00Z"),
		})

		mockDb.query.chats.findFirst.mockResolvedValue({ updatedAt: cursorDate })
		const chain = mockSelectLimitResult([chat1, chat2, chat3])

		const result = await chatData.getChatsByUserId(TEST_USER_ID, {
			limit: 2,
			cursor: "cursor-chat-id",
		})

		expect(result).toEqual({
			chats: [chat1, chat2],
			hasMore: true,
			nextCursor: chat2.id,
		})
		expect(chain.limit).toHaveBeenCalledWith(3)
		expect(mockDb.query.chats.findFirst).toHaveBeenCalledTimes(1)
	})

	it("getChatsByUserId uses default page size when params are omitted", async () => {
		const chat = createMockChat({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" })
		const chain = mockSelectLimitResult([chat])

		const result = await chatData.getChatsByUserId(TEST_USER_ID)

		expect(result).toEqual({
			chats: [chat],
			hasMore: false,
			nextCursor: undefined,
		})
		expect(chain.limit).toHaveBeenCalledWith(21)
		expect(mockDb.query.chats.findFirst).not.toHaveBeenCalled()
	})

	it("getChatsByUserId returns an empty page when user has no chats", async () => {
		const chain = mockSelectLimitResult([])

		const result = await chatData.getChatsByUserId(TEST_USER_ID, { limit: 2 })

		expect(result).toEqual({
			chats: [],
			hasMore: false,
			nextCursor: undefined,
		})
		expect(chain.limit).toHaveBeenCalledWith(3)
	})

	it("getChatsByUserId treats missing cursor row as first-page fallback", async () => {
		const chat = createMockChat({ id: "d1111111-dddd-4ddd-8ddd-dddddddddddd" })
		mockDb.query.chats.findFirst.mockResolvedValue(null)
		const chain = mockSelectLimitResult([chat])

		const result = await chatData.getChatsByUserId(TEST_USER_ID, {
			limit: 2,
			cursor: "deleted-cursor",
		})

		expect(result).toEqual({
			chats: [chat],
			hasMore: false,
			nextCursor: undefined,
		})
		expect(mockDb.query.chats.findFirst).toHaveBeenCalledTimes(1)
		expect(chain.limit).toHaveBeenCalledWith(3)
	})

	it("getChatsByUserId marks exact-limit result as last page", async () => {
		const chat1 = createMockChat({ id: "d2222222-dddd-4ddd-8ddd-dddddddddddd" })
		const chat2 = createMockChat({ id: "d3333333-dddd-4ddd-8ddd-dddddddddddd" })
		const chain = mockSelectLimitResult([chat1, chat2])

		const result = await chatData.getChatsByUserId(TEST_USER_ID, { limit: 2 })

		expect(result).toEqual({
			chats: [chat1, chat2],
			hasMore: false,
			nextCursor: undefined,
		})
		expect(chain.limit).toHaveBeenCalledWith(3)
	})

	it("getChatsByUserId wraps DB errors", async () => {
		const chain = mockSelectLimitResult([])
		chain.limit.mockRejectedValueOnce(new Error("broken select"))

		await expectInternalError(
			chatData.getChatsByUserId(TEST_USER_ID, { limit: 5 }),
			"Failed to get chats for user",
		)
	})

	it("getChatWithMessages returns chat and messages", async () => {
		const chat = createMockChat({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" })
		const message = createMockMessage({ chatId: chat.id })

		mockDb.query.chats.findFirst.mockResolvedValue(chat)
		mockSelectOrderByResult([message])

		const result = await chatData.getChatWithMessages(chat.id)

		expect(result).toEqual({ chat, messages: [message] })
	})

	it("getChatWithMessages returns null when chat does not exist", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(null)
		mockSelectOrderByResult([])

		const result = await chatData.getChatWithMessages("missing-chat")

		expect(result).toBeNull()
	})

	it("getChatWithMessages wraps DB errors", async () => {
		mockDb.query.chats.findFirst.mockRejectedValue(new Error("query failed"))
		mockSelectOrderByResult([])

		await expectInternalError(
			chatData.getChatWithMessages("chat-1"),
			"Failed to get chat with messages",
		)
	})

	it("createChat inserts with default visibility", async () => {
		const created = createMockChat({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff" })
		const chain = mockInsertReturning([created])

		const result = await chatData.createChat({
			id: created.id,
			userId: created.userId,
			title: created.title,
			model: created.model ?? undefined,
		})

		expect(result).toEqual(created)
		expect(chain.values).toHaveBeenCalledWith(
			expect.objectContaining({
				id: created.id,
				userId: created.userId,
				title: created.title,
				visibility: "private",
			}),
		)
	})

	it("createChat throws when insert returns no rows", async () => {
		mockInsertReturning([])

		await expect(
			chatData.createChat({
				id: "00000000-0000-4000-8000-000000000111",
				userId: TEST_USER_ID,
				title: "Empty insert",
			}),
		).rejects.toMatchObject({
			name: "AppError",
			code: "internal_error:database:query_failed",
			message: "Chat insert returned no rows",
		})
	})

	it("createChat wraps insert failures", async () => {
		const chain = mockInsertReturning([])
		chain.returning.mockRejectedValueOnce(new Error("insert failed"))

		await expectInternalError(
			chatData.createChat({
				id: "00000000-0000-4000-8000-000000000112",
				userId: TEST_USER_ID,
				title: "Failure",
			}),
			"Failed to create chat",
		)
	})

	it("updateChatTitle updates title and timestamp", async () => {
		const chain = mockUpdateWhere()

		await chatData.updateChatTitle("chat-1", "Renamed")

		expect(chain.set).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Renamed", updatedAt: expect.any(Date) }),
		)
		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("updateChatVisibility updates visibility and timestamp", async () => {
		const chain = mockUpdateWhere()

		await chatData.updateChatVisibility("chat-1", "public")

		expect(chain.set).toHaveBeenCalledWith(
			expect.objectContaining({ visibility: "public", updatedAt: expect.any(Date) }),
		)
	})

	it("updateChatVisibility wraps DB errors", async () => {
		const chain = mockUpdateWhere()
		chain.where.mockRejectedValueOnce(new Error("update failed"))

		await expectInternalError(
			chatData.updateChatVisibility("chat-1", "private"),
			"Failed to update chat visibility",
		)
	})

	it("deleteChat executes a delete by chat id", async () => {
		const chain = mockDeleteWhere()

		await chatData.deleteChat("chat-1")

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteAllChats executes a delete by user id", async () => {
		const chain = mockDeleteWhere()

		await chatData.deleteAllChats(TEST_USER_ID)

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("transferGuestChats returns number of transferred rows", async () => {
		const chain = mockUpdateReturning([{ id: "chat-1" }, { id: "chat-2" }])

		const transferred = await chatData.transferGuestChats("guest-user", TEST_USER_ID)

		expect(transferred).toBe(2)
		expect(chain.set).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: TEST_USER_ID,
				updatedAt: expect.any(Date),
			}),
		)
	})

	it("transferGuestChats returns zero when no rows are updated", async () => {
		mockUpdateReturning([])

		const transferred = await chatData.transferGuestChats("guest-user", TEST_USER_ID)

		expect(transferred).toBe(0)
	})

	it("transferGuestChats wraps update failures", async () => {
		const chain = mockUpdateReturning([])
		chain.returning.mockRejectedValueOnce(new Error("update failed"))

		await expectInternalError(
			chatData.transferGuestChats("guest-user", TEST_USER_ID),
			"Failed to transfer guest chats",
		)
	})
})

describe("lib/data/message", () => {
	it("getMessagesByChatId returns messages ordered by createdAt", async () => {
		const chatId = "11111111-1111-4111-8111-111111111112"
		const message = createMockMessage({ chatId })
		mockSelectOrderByResult([message])

		const result = await messageData.getMessagesByChatId(chatId)

		expect(result).toEqual([message])
	})

	it("getMessagesByChatId wraps DB errors", async () => {
		const chain = mockSelectOrderByResult([])
		chain.orderBy.mockRejectedValueOnce(new Error("select failed"))

		await expectInternalError(
			messageData.getMessagesByChatId("chat-1"),
			"Failed to get messages for chat",
		)
	})

	it("getMessageById returns a message when found", async () => {
		const message = createMockMessage({ id: "22222222-2222-4222-8222-222222222222" })
		mockSelectLimitResult([message])

		const result = await messageData.getMessageById(message.id)

		expect(result).toEqual(message)
	})

	it("getMessageById returns null when not found", async () => {
		mockSelectLimitResult([])

		const result = await messageData.getMessageById("missing-message")

		expect(result).toBeNull()
	})

	it("getMessageById wraps DB errors", async () => {
		const chain = mockSelectLimitResult([])
		chain.limit.mockRejectedValueOnce(new Error("message query failed"))

		await expectInternalError(messageData.getMessageById("message-1"), "Failed to get message")
	})

	it("saveMessages returns empty array for empty input", async () => {
		const result = await messageData.saveMessages([])

		expect(result).toEqual([])
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("saveMessages inserts and returns rows", async () => {
		const chatId = "33333333-3333-4333-8333-333333333333"
		const messageId = "44444444-4444-4444-8444-444444444444"
		const input: NewMessage[] = [
			{
				id: messageId,
				chatId,
				role: "user",
				parts: [{ type: "text", text: "Hello" }],
			},
		]
		const inserted = [createMockMessage({ id: messageId, chatId })]
		const chain = mockInsertReturning(inserted)

		const result = await messageData.saveMessages(input)

		expect(result).toEqual(inserted)
		expect(chain.values).toHaveBeenCalledWith(input)
	})

	it("saveMessages wraps DB insert errors", async () => {
		const chain = mockInsertReturning([])
		chain.returning.mockRejectedValueOnce(new Error("insert messages failed"))

		await expectInternalError(
			messageData.saveMessages([
				{
					id: "55555555-5555-4555-8555-555555555555",
					chatId: "66666666-6666-4666-8666-666666666666",
					role: "assistant",
					parts: [{ type: "text", text: "response" }],
				},
			]),
			"Failed to save messages",
		)
	})

	it("deleteMessagesByIdAfter does nothing when target message is missing", async () => {
		mockDb.select.mockReturnValueOnce(mockSelectLimitResult([]))
		mockDeleteWhere()

		await messageData.deleteMessagesByIdAfter("chat-1", "message-1")

		expect(mockDb.delete).not.toHaveBeenCalled()
	})

	it("deleteMessagesByIdAfter deletes messages at or after target timestamp", async () => {
		const createdAt = new Date("2026-01-01T00:00:00Z")
		mockDb.select.mockReturnValueOnce(mockSelectLimitResult([{ createdAt }]))
		const deleteChain = mockDeleteWhere()

		await messageData.deleteMessagesByIdAfter("chat-1", "message-1")

		expect(mockDb.delete).toHaveBeenCalledTimes(1)
		expect(deleteChain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteMessagesByIdAfter wraps DB errors", async () => {
		const chain = mockSelectLimitResult([])
		chain.limit.mockRejectedValueOnce(new Error("failed"))

		await expectInternalError(
			messageData.deleteMessagesByIdAfter("chat-1", "message-1"),
			"Failed to delete messages after target",
		)
	})

	it("deleteMessagesByChatId deletes all messages for a chat", async () => {
		const chain = mockDeleteWhere()

		await messageData.deleteMessagesByChatId("chat-1")

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteMessagesByChatId wraps DB errors", async () => {
		const chain = mockDeleteWhere()
		chain.where.mockRejectedValueOnce(new Error("delete messages failed"))

		await expectInternalError(
			messageData.deleteMessagesByChatId("chat-1"),
			"Failed to delete messages for chat",
		)
	})
})

describe("lib/data/artifact", () => {
	it("getArtifactById returns latest artifact version", async () => {
		const artifact = createMockArtifact({
			id: "55555555-5555-4555-8555-555555555555",
			updatedAt: new Date("2026-01-02T00:00:00Z"),
		})
		mockSelectLimitResult([artifact])

		const result = await artifactData.getArtifactById(artifact.id)

		expect(result).toEqual(artifact)
	})

	it("getArtifactById returns null when no artifact exists", async () => {
		mockSelectLimitResult([])

		const result = await artifactData.getArtifactById("missing-artifact")

		expect(result).toBeNull()
	})

	it("getArtifactById wraps DB errors", async () => {
		const chain = mockSelectLimitResult([])
		chain.limit.mockRejectedValueOnce(new Error("artifact lookup failed"))

		await expectInternalError(
			artifactData.getArtifactById("artifact-1"),
			"Failed to get artifact",
		)
	})

	it("getArtifactVersions returns all versions", async () => {
		const artifactA = createMockArtifact({ id: "66666666-6666-4666-8666-666666666666" })
		const artifactB = createMockArtifact({ id: artifactA.id })
		mockSelectOrderByResult([artifactB, artifactA])

		const result = await artifactData.getArtifactVersions(artifactA.id)

		expect(result).toEqual([artifactB, artifactA])
	})

	it("getArtifactVersions wraps DB errors", async () => {
		const chain = mockSelectOrderByResult([])
		chain.orderBy.mockRejectedValueOnce(new Error("artifact query failed"))

		await expectInternalError(
			artifactData.getArtifactVersions("artifact-1"),
			"Failed to get artifact versions",
		)
	})

	it("saveArtifactVersion inserts and returns a version", async () => {
		const artifact = createMockArtifact({ id: "77777777-7777-4777-8777-777777777777" })
		mockInsertReturning([artifact])

		const result = await artifactData.saveArtifactVersion({
			id: artifact.id,
			title: artifact.title,
			content: artifact.content ?? "",
			kind: artifact.kind,
			userId: artifact.userId,
			chatId: artifact.chatId,
		})

		expect(result).toEqual(artifact)
	})

	it("saveArtifactVersion throws when insert returns no rows", async () => {
		mockInsertReturning([])

		await expect(
			artifactData.saveArtifactVersion({
				id: "88888888-8888-4888-8888-888888888888",
				title: "Artifact",
				content: "content",
				kind: "text",
				userId: TEST_USER_ID,
				chatId: "99999999-9999-4999-8999-999999999999",
			}),
		).rejects.toMatchObject({
			name: "AppError",
			code: "internal_error:database:query_failed",
			message: "Artifact insert returned no rows",
		})
	})

	it("saveArtifactVersion wraps DB insert errors", async () => {
		const chain = mockInsertReturning([])
		chain.returning.mockRejectedValueOnce(new Error("artifact insert failed"))

		await expectInternalError(
			artifactData.saveArtifactVersion({
				id: "88888888-8888-4888-8888-888888888889",
				title: "Artifact",
				content: "content",
				kind: "text",
				userId: TEST_USER_ID,
				chatId: "99999999-9999-4999-8999-999999999998",
			}),
			"Failed to save artifact version",
		)
	})

	it("deleteArtifactVersion deletes versions at or after provided timestamp", async () => {
		const chain = mockDeleteWhere()
		const createdAt = new Date("2026-01-01T00:00:00Z")

		await artifactData.deleteArtifactVersion("artifact-1", createdAt)

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteArtifactVersion wraps DB errors", async () => {
		const chain = mockDeleteWhere()
		chain.where.mockRejectedValueOnce(new Error("artifact delete failed"))

		await expectInternalError(
			artifactData.deleteArtifactVersion("artifact-1", new Date("2026-01-01T00:00:00Z")),
			"Failed to delete artifact version",
		)
	})
})

describe("lib/data/user", () => {
	it("getUserByEmail returns first user result", async () => {
		const user = createMockUser({ id: TEST_USER_ID, email: "person@example.com" })
		mockSelectWhereResult([user])

		const result = await userData.getUserByEmail("PERSON@example.com")

		expect(result).toEqual(user)
	})

	it("getUserByEmail returns null when no user exists", async () => {
		mockSelectWhereResult([])

		const result = await userData.getUserByEmail("missing@example.com")

		expect(result).toBeNull()
	})

	it("getUserByEmail wraps DB errors", async () => {
		const chain = mockSelectWhereResult([])
		chain.where.mockRejectedValueOnce(new Error("email query failed"))

		await expectInternalError(
			userData.getUserByEmail("person@example.com"),
			"Failed to get user by email",
		)
	})

	it("getUserByEmail handles undefined input with wrapped error", async () => {
		await expectInternalError(
			userData.getUserByEmail(undefined as unknown as string),
			"Failed to get user by email",
		)
	})

	it("getUserById returns first matching user", async () => {
		const user = createMockUser({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" })
		mockSelectWhereResult([user])

		const result = await userData.getUserById(user.id)

		expect(result).toEqual(user)
	})

	it("getUserById returns null when no user exists", async () => {
		mockSelectWhereResult([])

		const result = await userData.getUserById("missing-user")

		expect(result).toBeNull()
	})

	it("getUserById wraps DB errors", async () => {
		const chain = mockSelectWhereResult([])
		chain.where.mockRejectedValueOnce(new Error("user query failed"))

		await expectInternalError(userData.getUserById("user-1"), "Failed to get user by id")
	})

	it("createUser inserts and returns new user", async () => {
		const created = createMockUser({
			id: "aaaaaaaa-0000-4000-8000-000000000001",
			email: "new@example.com",
		})
		const chain = mockInsertReturning([created])

		const result = await userData.createUser({
			id: created.id,
			email: created.email,
			passwordHash: created.passwordHash,
		})

		expect(result).toEqual(created)
		expect(chain.values).toHaveBeenCalledTimes(1)
	})

	it("createUser wraps insert-without-row errors", async () => {
		mockInsertReturning([])

		await expectInternalError(
			userData.createUser({ email: "missing-row@example.com" }),
			"Failed to create user",
		)
	})

	it("updateUserLastLogin updates timestamp", async () => {
		const chain = mockUpdateWhere()

		await userData.updateUserLastLogin(TEST_USER_ID)

		expect(chain.set).toHaveBeenCalledWith(
			expect.objectContaining({ lastLogin: expect.any(Date) }),
		)
	})

	it("updateUserLastLogin wraps DB errors", async () => {
		const chain = mockUpdateWhere()
		chain.where.mockRejectedValueOnce(new Error("last login update failed"))

		await expectInternalError(
			userData.updateUserLastLogin(TEST_USER_ID),
			"Failed to update user last login",
		)
	})

	it("ensureGuestUser uses onConflictDoNothing", async () => {
		const chain = mockInsertReturning([])

		await userData.ensureGuestUser(TEST_USER_ID)

		expect(chain.values).toHaveBeenCalledWith({ id: TEST_USER_ID })
		expect(chain.onConflictDoNothing).toHaveBeenCalledTimes(1)
	})

	it("ensureGuestUser wraps DB errors", async () => {
		const chain = mockInsertReturning([])
		chain.onConflictDoNothing.mockRejectedValueOnce(new Error("guest user insert failed"))

		await expectInternalError(
			userData.ensureGuestUser(TEST_USER_ID),
			"Failed to ensure guest user exists",
		)
	})
})

describe("lib/data/vote", () => {
	it("getVotesByChatId returns votes for user and chat", async () => {
		const vote = {
			chatId: "chat-1",
			messageId: "message-1",
			userId: TEST_USER_ID,
			isUpvoted: true,
		}
		mockSelectWhereResult([vote])

		const result = await voteData.getVotesByChatId("chat-1", TEST_USER_ID)

		expect(result).toEqual([vote])
	})

	it("getVotesByChatId wraps DB errors", async () => {
		const chain = mockSelectWhereResult([])
		chain.where.mockRejectedValueOnce(new Error("vote select failed"))

		await expectInternalError(
			voteData.getVotesByChatId("chat-1", TEST_USER_ID),
			"Failed to get votes for chat",
		)
	})

	it("upsertVote inserts or updates and returns vote", async () => {
		const vote = {
			chatId: "chat-1",
			messageId: "message-1",
			userId: TEST_USER_ID,
			isUpvoted: false,
		}
		const chain = mockInsertReturning([vote])

		const result = await voteData.upsertVote(vote)

		expect(result).toEqual(vote)
		expect(chain.onConflictDoUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ set: { isUpvoted: false } }),
		)
	})

	it("upsertVote throws when no row is returned", async () => {
		mockInsertReturning([])

		await expect(
			voteData.upsertVote({
				chatId: "chat-1",
				messageId: "message-1",
				userId: TEST_USER_ID,
				isUpvoted: true,
			}),
		).rejects.toMatchObject({
			name: "AppError",
			code: "internal_error:database:query_failed",
			message: "Vote upsert returned no rows",
		})
	})

	it("upsertVote wraps DB errors", async () => {
		const chain = mockInsertReturning([])
		chain.returning.mockRejectedValueOnce(new Error("vote upsert failed"))

		await expectInternalError(
			voteData.upsertVote({
				chatId: "chat-1",
				messageId: "message-1",
				userId: TEST_USER_ID,
				isUpvoted: true,
			}),
			"Failed to upsert vote",
		)
	})

	it("deleteVotesByChatId deletes rows", async () => {
		const chain = mockDeleteWhere()

		await voteData.deleteVotesByChatId("chat-1", TEST_USER_ID)

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteVotesByChatId wraps DB errors", async () => {
		const chain = mockDeleteWhere()
		chain.where.mockRejectedValueOnce(new Error("vote delete failed"))

		await expectInternalError(
			voteData.deleteVotesByChatId("chat-1", TEST_USER_ID),
			"Failed to delete votes for chat",
		)
	})
})

describe("lib/data/suggestion", () => {
	it("getSuggestionsByArtifactId returns suggestions", async () => {
		const suggestion = {
			id: "bbbbbbbb-0000-4000-8000-000000000001",
			artifactId: "artifact-1",
			artifactCreatedAt: new Date("2026-01-01T00:00:00Z"),
			originalText: "old",
			suggestedText: "new",
			description: "replace text",
			isResolved: false,
			userId: TEST_USER_ID,
			createdAt: new Date("2026-01-01T00:00:00Z"),
		}
		mockSelectWhereResult([suggestion])

		const result = await suggestionData.getSuggestionsByArtifactId("artifact-1")

		expect(result).toEqual([suggestion])
	})

	it("getSuggestionsByArtifactId returns empty array when nothing is found", async () => {
		mockSelectWhereResult([])

		const result = await suggestionData.getSuggestionsByArtifactId("artifact-1")

		expect(result).toEqual([])
	})

	it("getSuggestionsByArtifactId wraps DB errors", async () => {
		const chain = mockSelectWhereResult([])
		chain.where.mockRejectedValueOnce(new Error("suggestion query failed"))

		await expectInternalError(
			suggestionData.getSuggestionsByArtifactId("artifact-1"),
			"Failed to get suggestions for artifact",
		)
	})

	it("saveSuggestions returns empty array for empty input", async () => {
		const result = await suggestionData.saveSuggestions([])

		expect(result).toEqual([])
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("saveSuggestions inserts and returns rows", async () => {
		const input: NewSuggestion[] = [
			{
				id: "bbbbbbbb-0000-4000-8000-000000000002",
				artifactId: "artifact-1",
				artifactCreatedAt: new Date("2026-01-01T00:00:00Z"),
				originalText: "one",
				suggestedText: "two",
				description: "update",
				isResolved: false,
				userId: TEST_USER_ID,
			},
		]
		const inserted = [
			{
				...input[0],
				createdAt: new Date("2026-01-01T00:01:00Z"),
			},
		]
		const chain = mockInsertReturning(inserted)

		const result = await suggestionData.saveSuggestions(input)

		expect(result).toEqual(inserted)
		expect(chain.values).toHaveBeenCalledWith(input)
	})

	it("saveSuggestions wraps DB errors", async () => {
		const chain = mockInsertReturning([])
		chain.returning.mockRejectedValueOnce(new Error("failed insert"))

		await expectInternalError(
			suggestionData.saveSuggestions([
				{
					artifactId: "artifact-1",
					artifactCreatedAt: new Date("2026-01-01T00:00:00Z"),
					originalText: "one",
					suggestedText: "two",
					userId: TEST_USER_ID,
				},
			]),
			"Failed to save suggestions",
		)
	})

	it("deleteSuggestionsByArtifactId deletes rows", async () => {
		const chain = mockDeleteWhere()

		await suggestionData.deleteSuggestionsByArtifactId("artifact-1")

		expect(chain.where).toHaveBeenCalledTimes(1)
	})

	it("deleteSuggestionsByArtifactId wraps DB errors", async () => {
		const chain = mockDeleteWhere()
		chain.where.mockRejectedValueOnce(new Error("suggestion delete failed"))

		await expectInternalError(
			suggestionData.deleteSuggestionsByArtifactId("artifact-1"),
			"Failed to delete suggestions for artifact",
		)
	})
})
