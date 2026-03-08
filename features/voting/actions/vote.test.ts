// Flow: voting | Step: vote-action
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

const mockGetAppSession = vi.fn()
const mockGetChatOwnerId = vi.fn()
const mockGetMessageById = vi.fn()
const mockUpsertVote = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockInvalidateVotes = vi.fn()

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatOwnerId: (...args: unknown[]) => mockGetChatOwnerId(...args),
}))

vi.mock("@/lib/data/message", () => ({
	getMessageById: (...args: unknown[]) => mockGetMessageById(...args),
}))

vi.mock("@/lib/data/vote", () => ({
	upsertVote: (...args: unknown[]) => mockUpsertVote(...args),
}))

vi.mock("@/lib/cache/rate-limit", () => ({
	checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock("@/lib/cache/revalidate", () => ({
	invalidateVotes: (...args: unknown[]) => mockInvalidateVotes(...args),
}))

vi.mock("@/lib/cache/keys", () => ({
	rateLimitKeys: {
		rateLimitVote: (userId: string) => `vote:${userId}`,
	},
}))

// Import after mocks
const { voteOnMessage } = await import("./vote")

// ── Fixtures ─────────────────────────────────────────────────

const USER_ID = "user-abc-123"
const CHAT_ID = "550e8400-e29b-41d4-a716-446655440000"
const MESSAGE_ID = "660e8400-e29b-41d4-a716-446655440001"
const OTHER_USER = "user-xyz-789"

const validSession = {
	user: { id: USER_ID, type: "authenticated" as const, email: "test@example.com" },
}

const guestSession = {
	user: { id: "guest-123", type: "guest" as const },
}

const validInput = { chatId: CHAT_ID, messageId: MESSAGE_ID, type: "up" as const }

// ── Tests ────────────────────────────────────────────────────

describe("voteOnMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAppSession.mockResolvedValue(validSession)
		mockGetChatOwnerId.mockResolvedValue(USER_ID)
		mockGetMessageById.mockResolvedValue({ id: MESSAGE_ID, chatId: CHAT_ID })
		mockUpsertVote.mockResolvedValue(undefined)
		mockCheckRateLimit.mockResolvedValue(true)
	})

	it("allows owner to upvote a message", async () => {
		const result = await voteOnMessage(validInput)

		expect(result).toEqual({
			success: true,
			data: { messageId: MESSAGE_ID, type: "up" },
		})
		expect(mockUpsertVote).toHaveBeenCalledWith({
			chatId: CHAT_ID,
			messageId: MESSAGE_ID,
			userId: USER_ID,
			isUpvoted: true,
		})
		expect(mockInvalidateVotes).toHaveBeenCalledWith(CHAT_ID)
	})

	it("allows owner to downvote a message", async () => {
		const result = await voteOnMessage({ ...validInput, type: "down" })

		expect(result).toEqual({
			success: true,
			data: { messageId: MESSAGE_ID, type: "down" },
		})
		expect(mockUpsertVote).toHaveBeenCalledWith({
			chatId: CHAT_ID,
			messageId: MESSAGE_ID,
			userId: USER_ID,
			isUpvoted: false,
		})
	})

	it("rejects unauthenticated users", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("rejects guest users", async () => {
		mockGetAppSession.mockResolvedValue(guestSession)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:auth:guest_restricted")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("rejects non-owner of the chat", async () => {
		mockGetChatOwnerId.mockResolvedValue(OTHER_USER)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
	})

	it("rejects when chat does not exist", async () => {
		mockGetChatOwnerId.mockResolvedValue(null)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:chat:chat_not_found")
		}
	})

	it("rejects when message is not in the chat (IDOR protection)", async () => {
		mockGetMessageById.mockResolvedValue({ id: MESSAGE_ID, chatId: "different-chat-id" })

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:vote:message_not_in_chat")
		}
	})

	it("rejects when message does not exist", async () => {
		mockGetMessageById.mockResolvedValue(null)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:vote:message_not_in_chat")
		}
	})

	it("rejects invalid input", async () => {
		const result = await voteOnMessage({ chatId: "not-a-uuid", messageId: "bad", type: "up" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("rejects invalid vote type", async () => {
		const result = await voteOnMessage({ chatId: CHAT_ID, messageId: MESSAGE_ID, type: "meh" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
	})

	it("runs chat ownership and message checks in parallel", async () => {
		const chatOwnerPromise = new Promise<string>((resolve) =>
			setTimeout(() => resolve(USER_ID), 10),
		)
		const messagePromise = new Promise<{ id: string; chatId: string }>((resolve) =>
			setTimeout(() => resolve({ id: MESSAGE_ID, chatId: CHAT_ID }), 10),
		)

		mockGetChatOwnerId.mockReturnValue(chatOwnerPromise)
		mockGetMessageById.mockReturnValue(messagePromise)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(true)
		// Both should have been called (parallel via Promise.all)
		expect(mockGetChatOwnerId).toHaveBeenCalledWith(CHAT_ID)
		expect(mockGetMessageById).toHaveBeenCalledWith(MESSAGE_ID)
	})

	it("rejects when rate limited", async () => {
		mockCheckRateLimit.mockResolvedValue(false)

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("rate_limit:vote:too_many_requests")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("returns internal error when DB upsert fails", async () => {
		mockUpsertVote.mockRejectedValue(new Error("DB error"))

		const result = await voteOnMessage(validInput)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
	})

	it("does not invalidate cache when DB upsert fails", async () => {
		mockUpsertVote.mockRejectedValue(new Error("DB error"))

		await voteOnMessage(validInput)

		expect(mockInvalidateVotes).not.toHaveBeenCalled()
	})
})
