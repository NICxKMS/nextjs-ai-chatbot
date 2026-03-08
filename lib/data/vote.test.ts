// Flow: data-access | Step: vote-queries
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

import { createMockDb } from "@/__tests__/mocks/db"
import { AppError } from "@/lib/errors/app-error"

// ── Mocks ────────────────────────────────────────────────────
const mockDb = createMockDb()

vi.mock("@/lib/db/client", () => ({ db: mockDb }))
vi.mock("@/lib/db/schema", () => ({
	votes: { chatId: "chatId", messageId: "messageId", userId: "userId", isUpvoted: "isUpvoted" },
}))

// Import after mocks are registered
const { getVotesByChatId, upsertVote } = await import("@/lib/data/vote")

// ── Fixtures ─────────────────────────────────────────────────
const CHAT_ID = "chat-abc-123"
const USER_ID = "user-xyz-789"
const MESSAGE_ID = "msg-def-456"

const mockVote = {
	chatId: CHAT_ID,
	messageId: MESSAGE_ID,
	userId: USER_ID,
	isUpvoted: true,
}

// ── Tests ────────────────────────────────────────────────────
describe("getVotesByChatId", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset chain so all methods return `this` again
		for (const method of Object.keys(mockDb)) {
			const fn = mockDb[method as keyof typeof mockDb] as MockInstance
			fn.mockReturnThis()
		}
	})

	it("returns votes for a chat and user", async () => {
		const votes = [mockVote, { ...mockVote, messageId: "msg-2", isUpvoted: false }]
		mockDb.where.mockResolvedValue(votes)

		const result = await getVotesByChatId(CHAT_ID, USER_ID)

		expect(result).toEqual(votes)
		expect(mockDb.select).toHaveBeenCalled()
		expect(mockDb.from).toHaveBeenCalled()
		expect(mockDb.where).toHaveBeenCalled()
	})

	it("returns empty array when no votes exist", async () => {
		mockDb.where.mockResolvedValue([])

		const result = await getVotesByChatId(CHAT_ID, USER_ID)

		expect(result).toEqual([])
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("connection refused"))

		await expect(getVotesByChatId(CHAT_ID, USER_ID)).rejects.toThrow(AppError)
		await expect(getVotesByChatId(CHAT_ID, USER_ID)).rejects.toMatchObject({
			code: "internal_error:database:query_failed",
		})
	})

	it("re-throws AppError without wrapping", async () => {
		const original = AppError.notFound("not_found:chat:chat_not_found", "Chat gone")
		mockDb.where.mockRejectedValue(original)

		await expect(getVotesByChatId(CHAT_ID, USER_ID)).rejects.toBe(original)
	})
})

describe("upsertVote", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		for (const method of Object.keys(mockDb)) {
			const fn = mockDb[method as keyof typeof mockDb] as MockInstance
			fn.mockReturnThis()
		}
	})

	it("inserts a new vote and returns it", async () => {
		mockDb.returning.mockResolvedValue([mockVote])

		const result = await upsertVote({
			chatId: CHAT_ID,
			messageId: MESSAGE_ID,
			userId: USER_ID,
			isUpvoted: true,
		})

		expect(result).toEqual(mockVote)
		expect(mockDb.insert).toHaveBeenCalled()
		expect(mockDb.values).toHaveBeenCalled()
		expect(mockDb.onConflictDoUpdate).toHaveBeenCalled()
		expect(mockDb.returning).toHaveBeenCalled()
	})

	it("throws AppError when returning yields empty array", async () => {
		mockDb.returning.mockResolvedValue([])

		await expect(
			upsertVote({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				userId: USER_ID,
				isUpvoted: false,
			}),
		).rejects.toThrow(AppError)

		await expect(
			upsertVote({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				userId: USER_ID,
				isUpvoted: false,
			}),
		).rejects.toMatchObject({
			code: "internal_error:database:query_failed",
		})
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("deadlock detected"))

		await expect(
			upsertVote({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				userId: USER_ID,
				isUpvoted: true,
			}),
		).rejects.toThrow(AppError)
	})

	it("re-throws AppError without double-wrapping", async () => {
		const original = AppError.internal(
			"internal_error:database:query_failed",
			"Already wrapped",
		)
		mockDb.returning.mockRejectedValue(original)

		await expect(
			upsertVote({
				chatId: CHAT_ID,
				messageId: MESSAGE_ID,
				userId: USER_ID,
				isUpvoted: true,
			}),
		).rejects.toBe(original)
	})
})
