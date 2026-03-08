// Flow: data-access | Step: chat-queries
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors/app-error"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => {
	const chain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		execute: vi.fn().mockResolvedValue([]),
	}

	// Transaction mock: callback receives a tx object with the same chainable API
	const txChain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		execute: vi.fn().mockResolvedValue([]),
	}

	return {
		db: {
			...chain,
			query: {
				chats: {
					findFirst: vi.fn(),
				},
			},
			transaction: vi.fn(async (cb: (tx: typeof txChain) => Promise<unknown>) => cb(txChain)),
			_tx: txChain,
		},
	}
})

import { db } from "@/lib/db/client"

const mockDb = db as unknown as {
	select: ReturnType<typeof vi.fn>
	from: ReturnType<typeof vi.fn>
	where: ReturnType<typeof vi.fn>
	limit: ReturnType<typeof vi.fn>
	orderBy: ReturnType<typeof vi.fn>
	insert: ReturnType<typeof vi.fn>
	values: ReturnType<typeof vi.fn>
	update: ReturnType<typeof vi.fn>
	set: ReturnType<typeof vi.fn>
	delete: ReturnType<typeof vi.fn>
	returning: ReturnType<typeof vi.fn>
	execute: ReturnType<typeof vi.fn>
	query: {
		chats: {
			findFirst: ReturnType<typeof vi.fn>
		}
	}
	transaction: ReturnType<typeof vi.fn>
	_tx: {
		select: ReturnType<typeof vi.fn>
		from: ReturnType<typeof vi.fn>
		where: ReturnType<typeof vi.fn>
		limit: ReturnType<typeof vi.fn>
		orderBy: ReturnType<typeof vi.fn>
		insert: ReturnType<typeof vi.fn>
		values: ReturnType<typeof vi.fn>
		update: ReturnType<typeof vi.fn>
		set: ReturnType<typeof vi.fn>
		delete: ReturnType<typeof vi.fn>
		returning: ReturnType<typeof vi.fn>
		execute: ReturnType<typeof vi.fn>
	}
}

import {
	createChat,
	createChatWithInitialMessage,
	deleteAllChats,
	deleteChat,
	getChatById,
	getChatOwnerId,
	getChatsByUserId,
	saveMessagesAndTouchChat,
	transferGuestChats,
	updateChatTitle,
	updateChatVisibility,
} from "./chat"

// ── Fixtures ─────────────────────────────────────────────────

const CHAT_ID = "c0000000-0000-0000-0000-000000000001"
const USER_ID = "u0000000-0000-0000-0000-000000000001"
const NOW = new Date("2026-01-01T00:00:00Z")

const mockChat = {
	id: CHAT_ID,
	userId: USER_ID,
	title: "Test Chat",
	createdAt: NOW,
	updatedAt: NOW,
	visibility: "private" as const,
	model: "gpt-4",
}

// ── Helpers ──────────────────────────────────────────────────

function resetChainMocks() {
	for (const key of Object.keys(mockDb)) {
		if (key === "query" || key === "transaction" || key === "_tx") continue
		const fn = mockDb[key as keyof typeof mockDb]
		if (typeof fn === "function" && "mockClear" in fn) {
			;(fn as ReturnType<typeof vi.fn>).mockClear().mockReturnThis()
		}
	}
	mockDb.returning.mockResolvedValue([])
	mockDb.execute.mockResolvedValue([])

	for (const key of Object.keys(mockDb._tx)) {
		const fn = mockDb._tx[key as keyof typeof mockDb._tx]
		if (typeof fn === "function" && "mockClear" in fn) {
			;(fn as ReturnType<typeof vi.fn>).mockClear().mockReturnThis()
		}
	}
	mockDb._tx.returning.mockResolvedValue([])
	mockDb._tx.execute.mockResolvedValue([])

	mockDb.query.chats.findFirst.mockReset()
	mockDb.transaction.mockClear()
	mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockDb._tx) => Promise<unknown>) =>
		cb(mockDb._tx),
	)
}

beforeEach(() => {
	resetChainMocks()
})

// ── Tests ────────────────────────────────────────────────────

describe("getChatById", () => {
	it("returns the chat when found", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(mockChat)

		const result = await getChatById(CHAT_ID)

		expect(result).toEqual(mockChat)
		expect(mockDb.query.chats.findFirst).toHaveBeenCalledOnce()
	})

	it("returns null when not found", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(undefined)

		const result = await getChatById(CHAT_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.query.chats.findFirst.mockRejectedValue(new Error("connection refused"))

		await expect(getChatById(CHAT_ID)).rejects.toThrow(AppError)
	})
})

describe("getChatsByUserId", () => {
	const summaries = [
		{
			id: "c1",
			title: "Chat 1",
			createdAt: NOW,
			updatedAt: NOW,
			visibility: "private" as const,
		},
		{
			id: "c2",
			title: "Chat 2",
			createdAt: NOW,
			updatedAt: NOW,
			visibility: "private" as const,
		},
	]

	it("returns chats with hasMore=false when under limit", async () => {
		mockDb.limit.mockResolvedValue(summaries)

		const result = await getChatsByUserId(USER_ID)

		expect(result.chats).toEqual(summaries)
		expect(result.hasMore).toBe(false)
		expect(result.nextCursor).toBeUndefined()
	})

	it("returns hasMore=true when results exceed limit", async () => {
		// Request limit defaults to 20, so mock 21 items to trigger hasMore
		const manyChats = Array.from({ length: 21 }, (_, i) => ({
			id: `c${i}`,
			title: `Chat ${i}`,
			createdAt: NOW,
			updatedAt: NOW,
			visibility: "private" as const,
		}))
		mockDb.limit.mockResolvedValue(manyChats)

		const result = await getChatsByUserId(USER_ID)

		expect(result.hasMore).toBe(true)
		expect(result.chats).toHaveLength(20)
		expect(result.nextCursor).toBe("c19")
	})

	it("handles cursor-based pagination", async () => {
		const cursorChat = { updatedAt: NOW }
		mockDb.query.chats.findFirst.mockResolvedValue(cursorChat)
		mockDb.limit.mockResolvedValue(summaries)

		const result = await getChatsByUserId(USER_ID, {
			cursor: "cursor-id",
			limit: 10,
		})

		expect(mockDb.query.chats.findFirst).toHaveBeenCalledOnce()
		expect(result.chats).toEqual(summaries)
	})

	it("ignores invalid cursor", async () => {
		mockDb.query.chats.findFirst.mockResolvedValue(undefined)
		mockDb.limit.mockResolvedValue(summaries)

		const result = await getChatsByUserId(USER_ID, { cursor: "nonexistent" })

		expect(result.chats).toEqual(summaries)
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("timeout"))

		await expect(getChatsByUserId(USER_ID)).rejects.toThrow(AppError)
	})
})

describe("getChatOwnerId", () => {
	it("returns userId when chat exists", async () => {
		mockDb.limit.mockResolvedValue([{ userId: USER_ID }])

		const result = await getChatOwnerId(CHAT_ID)

		expect(result).toBe(USER_ID)
	})

	it("returns null when chat does not exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getChatOwnerId(CHAT_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("connection lost"))

		await expect(getChatOwnerId(CHAT_ID)).rejects.toThrow(AppError)
	})
})

describe("createChat", () => {
	it("inserts and returns the created chat", async () => {
		mockDb.returning.mockResolvedValue([mockChat])

		const result = await createChat({
			id: CHAT_ID,
			userId: USER_ID,
			title: "Test Chat",
			model: "gpt-4",
		})

		expect(result).toEqual(mockChat)
		expect(mockDb.insert).toHaveBeenCalledOnce()
		expect(mockDb.values).toHaveBeenCalledOnce()
	})

	it("defaults visibility to private", async () => {
		mockDb.returning.mockResolvedValue([mockChat])

		await createChat({
			id: CHAT_ID,
			userId: USER_ID,
			title: "Test Chat",
		})

		expect(mockDb.values).toHaveBeenCalledWith(
			expect.objectContaining({ visibility: "private" }),
		)
	})

	it("throws AppError when insert returns no rows", async () => {
		mockDb.returning.mockResolvedValue([undefined])

		await expect(createChat({ id: CHAT_ID, userId: USER_ID, title: "Test" })).rejects.toThrow(
			AppError,
		)
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("unique constraint"))

		await expect(createChat({ id: CHAT_ID, userId: USER_ID, title: "Test" })).rejects.toThrow(
			AppError,
		)
	})
})

describe("createChatWithInitialMessage", () => {
	const message = {
		id: "m1",
		chatId: CHAT_ID,
		role: "user" as const,
		parts: [{ type: "text", text: "hello" }],
	}

	it("creates chat and message in a transaction", async () => {
		mockDb._tx.returning.mockResolvedValue([mockChat])

		const result = await createChatWithInitialMessage({
			id: CHAT_ID,
			userId: USER_ID,
			title: "Test Chat",
			message,
		})

		expect(result).toEqual(mockChat)
		expect(mockDb.transaction).toHaveBeenCalledOnce()
		expect(mockDb._tx.insert).toHaveBeenCalledTimes(2)
	})

	it("throws AppError when transaction fails", async () => {
		mockDb.transaction.mockRejectedValue(new Error("deadlock"))

		await expect(
			createChatWithInitialMessage({
				id: CHAT_ID,
				userId: USER_ID,
				title: "Test",
				message,
			}),
		).rejects.toThrow(AppError)
	})
})

describe("updateChatTitle", () => {
	it("updates chat title with new updatedAt", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await updateChatTitle(CHAT_ID, "New Title")

		expect(mockDb.update).toHaveBeenCalledOnce()
		expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ title: "New Title" }))
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("connection reset"))

		await expect(updateChatTitle(CHAT_ID, "New Title")).rejects.toThrow(AppError)
	})
})

describe("saveMessagesAndTouchChat", () => {
	const newMessages = [
		{
			id: "m1",
			chatId: CHAT_ID,
			role: "assistant" as const,
			parts: [{ type: "text", text: "hi" }],
		},
	]

	it("saves messages and touches chat in a transaction", async () => {
		mockDb._tx.where.mockResolvedValue(undefined)

		await saveMessagesAndTouchChat({ chatId: CHAT_ID, messages: newMessages })

		expect(mockDb.transaction).toHaveBeenCalledOnce()
		expect(mockDb._tx.insert).toHaveBeenCalledOnce()
		expect(mockDb._tx.update).toHaveBeenCalledOnce()
	})

	it("skips message insert when messages array is empty", async () => {
		mockDb._tx.where.mockResolvedValue(undefined)

		await saveMessagesAndTouchChat({ chatId: CHAT_ID, messages: [] })

		expect(mockDb._tx.insert).not.toHaveBeenCalled()
		expect(mockDb._tx.update).toHaveBeenCalledOnce()
	})

	it("includes title in set when provided", async () => {
		mockDb._tx.where.mockResolvedValue(undefined)

		await saveMessagesAndTouchChat({
			chatId: CHAT_ID,
			messages: newMessages,
			title: "Updated Title",
		})

		expect(mockDb._tx.set).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Updated Title" }),
		)
	})

	it("throws AppError on database failure", async () => {
		mockDb.transaction.mockRejectedValue(new Error("serialization failure"))

		await expect(
			saveMessagesAndTouchChat({ chatId: CHAT_ID, messages: newMessages }),
		).rejects.toThrow(AppError)
	})
})

describe("updateChatVisibility", () => {
	it("updates visibility with new updatedAt", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await updateChatVisibility(CHAT_ID, "public")

		expect(mockDb.update).toHaveBeenCalledOnce()
		expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ visibility: "public" }))
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("timeout"))

		await expect(updateChatVisibility(CHAT_ID, "public")).rejects.toThrow(AppError)
	})
})

describe("deleteChat", () => {
	it("deletes the chat by ID", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await deleteChat(CHAT_ID)

		expect(mockDb.delete).toHaveBeenCalledOnce()
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("FK constraint"))

		await expect(deleteChat(CHAT_ID)).rejects.toThrow(AppError)
	})
})

describe("deleteAllChats", () => {
	it("deletes all chats for a user", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await deleteAllChats(USER_ID)

		expect(mockDb.delete).toHaveBeenCalledOnce()
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("timeout"))

		await expect(deleteAllChats(USER_ID)).rejects.toThrow(AppError)
	})
})

describe("transferGuestChats", () => {
	const FROM_USER = "u-guest"
	const TO_USER = "u-auth"

	it("transfers chats, artifacts, and suggestions atomically", async () => {
		// First .where() must chain to .returning() (chats update);
		// subsequent .where() calls are terminal (artifacts, suggestions).
		mockDb._tx.where
			.mockReturnValueOnce({
				returning: vi.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]),
			})
			.mockResolvedValue(undefined)

		const count = await transferGuestChats(FROM_USER, TO_USER)

		expect(count).toBe(2)
		expect(mockDb.transaction).toHaveBeenCalledOnce()
		// update called 3 times: chats, artifacts, suggestions
		expect(mockDb._tx.update).toHaveBeenCalledTimes(3)
	})

	it("returns 0 when no guest chats exist", async () => {
		// First .where() chains to .returning() (empty result);
		// subsequent .where() calls are terminal.
		mockDb._tx.where
			.mockReturnValueOnce({
				returning: vi.fn().mockResolvedValue([]),
			})
			.mockResolvedValue(undefined)

		const count = await transferGuestChats(FROM_USER, TO_USER)

		expect(count).toBe(0)
	})

	it("throws AppError on transaction failure", async () => {
		mockDb.transaction.mockRejectedValue(new Error("deadlock detected"))

		await expect(transferGuestChats(FROM_USER, TO_USER)).rejects.toThrow(AppError)
	})
})
