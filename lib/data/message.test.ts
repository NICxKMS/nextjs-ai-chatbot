// Flow: data-access | Step: message-queries
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
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		execute: vi.fn().mockResolvedValue([]),
	}

	const txChain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		execute: vi.fn().mockResolvedValue([]),
	}

	return {
		db: {
			...chain,
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
	delete: ReturnType<typeof vi.fn>
	returning: ReturnType<typeof vi.fn>
	execute: ReturnType<typeof vi.fn>
	transaction: ReturnType<typeof vi.fn>
	_tx: {
		select: ReturnType<typeof vi.fn>
		from: ReturnType<typeof vi.fn>
		where: ReturnType<typeof vi.fn>
		limit: ReturnType<typeof vi.fn>
		orderBy: ReturnType<typeof vi.fn>
		insert: ReturnType<typeof vi.fn>
		values: ReturnType<typeof vi.fn>
		delete: ReturnType<typeof vi.fn>
		returning: ReturnType<typeof vi.fn>
		execute: ReturnType<typeof vi.fn>
	}
}

import {
	deleteMessagesByIdAfter,
	getMessageById,
	getMessagesForChatRender,
	saveMessages,
} from "./message"

// ── Fixtures ─────────────────────────────────────────────────

const CHAT_ID = "c0000000-0000-0000-0000-000000000001"
const MESSAGE_ID = "m0000000-0000-0000-0000-000000000001"
const NOW = new Date("2026-01-01T00:00:00Z")

const mockMessage = {
	id: MESSAGE_ID,
	chatId: CHAT_ID,
	role: "user" as const,
	parts: [{ type: "text", text: "Hello" }],
	attachments: [],
	createdAt: NOW,
}

const mockRenderMessage = {
	id: MESSAGE_ID,
	role: "user" as const,
	parts: [{ type: "text", text: "Hello" }],
}

// ── Helpers ──────────────────────────────────────────────────

function resetChainMocks() {
	for (const key of Object.keys(mockDb)) {
		if (key === "transaction" || key === "_tx") continue
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

	mockDb.transaction.mockClear()
	mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockDb._tx) => Promise<unknown>) =>
		cb(mockDb._tx),
	)
}

beforeEach(() => {
	resetChainMocks()
})

// ── Tests ────────────────────────────────────────────────────

describe("getMessagesForChatRender", () => {
	it("returns reduced message shapes for rendering", async () => {
		mockDb.limit.mockResolvedValue([mockRenderMessage])

		const result = await getMessagesForChatRender(CHAT_ID)

		expect(result).toEqual([mockRenderMessage])
		expect(mockDb.select).toHaveBeenCalledOnce()
	})

	it("returns empty array when no messages exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getMessagesForChatRender(CHAT_ID)

		expect(result).toEqual([])
	})

	it("respects custom limit parameter", async () => {
		mockDb.limit.mockResolvedValue([])

		await getMessagesForChatRender(CHAT_ID, 50)

		expect(mockDb.limit).toHaveBeenCalledWith(50)
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("query error"))

		await expect(getMessagesForChatRender(CHAT_ID)).rejects.toThrow(AppError)
	})
})

describe("getMessageById", () => {
	it("returns the message when found", async () => {
		mockDb.limit.mockResolvedValue([mockMessage])

		const result = await getMessageById(MESSAGE_ID)

		expect(result).toEqual(mockMessage)
	})

	it("returns null when not found", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getMessageById(MESSAGE_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("timeout"))

		await expect(getMessageById(MESSAGE_ID)).rejects.toThrow(AppError)
	})
})

describe("saveMessages", () => {
	it("returns empty array for empty input", async () => {
		const result = await saveMessages([])

		expect(result).toEqual([])
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("batch inserts and returns created messages", async () => {
		const newMessages = [
			{
				id: "m1",
				chatId: CHAT_ID,
				role: "user" as const,
				parts: [{ type: "text", text: "hi" }],
			},
			{
				id: "m2",
				chatId: CHAT_ID,
				role: "assistant" as const,
				parts: [{ type: "text", text: "hello" }],
			},
		]
		const inserted = newMessages.map((m) => ({
			...m,
			attachments: [],
			createdAt: NOW,
		}))
		mockDb.returning.mockResolvedValue(inserted)

		const result = await saveMessages(newMessages)

		expect(result).toEqual(inserted)
		expect(mockDb.insert).toHaveBeenCalledOnce()
		expect(mockDb.values).toHaveBeenCalledWith(newMessages)
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("constraint violation"))

		await expect(
			saveMessages([
				{
					id: "m1",
					chatId: CHAT_ID,
					role: "user" as const,
					parts: [],
				},
			]),
		).rejects.toThrow(AppError)
	})
})

describe("deleteMessagesByIdAfter", () => {
	it("deletes target message and all after it in a transaction", async () => {
		// First .where() must chain to .limit() (select for target lookup);
		// second .where() is terminal (delete).
		mockDb._tx.where
			.mockReturnValueOnce({
				limit: vi.fn().mockResolvedValue([{ createdAt: NOW }]),
			})
			.mockResolvedValue(undefined)

		await deleteMessagesByIdAfter(CHAT_ID, MESSAGE_ID)

		expect(mockDb.transaction).toHaveBeenCalledOnce()
		// select for target lookup, then delete
		expect(mockDb._tx.select).toHaveBeenCalledOnce()
		expect(mockDb._tx.delete).toHaveBeenCalledOnce()
	})

	it("does nothing when target message not found", async () => {
		mockDb._tx.limit.mockResolvedValue([])

		await deleteMessagesByIdAfter(CHAT_ID, "nonexistent")

		expect(mockDb.transaction).toHaveBeenCalledOnce()
		expect(mockDb._tx.delete).not.toHaveBeenCalled()
	})

	it("throws AppError on database failure", async () => {
		mockDb.transaction.mockRejectedValue(new Error("deadlock"))

		await expect(deleteMessagesByIdAfter(CHAT_ID, MESSAGE_ID)).rejects.toThrow(AppError)
	})
})
