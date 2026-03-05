import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockChat, createMockMessage } from "@/tests/fixtures/chat"
import { createMockSession, createMockUserPair, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockIncr = vi.fn()
const mockExpire = vi.fn()
vi.mock("@/lib/cache/client", () => ({
	incr: (...args: unknown[]) => mockIncr(...args),
	expire: (...args: unknown[]) => mockExpire(...args),
}))

const mockInvalidateVotes = vi.fn()
vi.mock("@/lib/cache/revalidate", () => ({
	invalidateVotes: (...args: unknown[]) => mockInvalidateVotes(...args),
}))

const mockGetChatById = vi.fn()
vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
}))

const mockGetMessageById = vi.fn()
vi.mock("@/lib/data/message", () => ({
	getMessageById: (...args: unknown[]) => mockGetMessageById(...args),
}))

const mockUpsertVote = vi.fn()
vi.mock("@/lib/data/vote", () => ({
	upsertVote: (...args: unknown[]) => mockUpsertVote(...args),
}))

describe("voteOnMessage action", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockGetAppSession.mockResolvedValue(createMockSession())
		mockIncr.mockResolvedValue(1)
		mockExpire.mockResolvedValue(undefined)
		mockGetChatById.mockResolvedValue(createMockChat())
		mockGetMessageById.mockResolvedValue(createMockMessage())
		mockUpsertVote.mockResolvedValue(undefined)
	})

	it("returns unauthorized when unauthenticated", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		mockGetAppSession.mockResolvedValue(null)

		const result = await voteOnMessage({
			chatId: crypto.randomUUID(),
			messageId: crypto.randomUUID(),
			type: "up",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:chat:auth_required")
		}
	})

	it("returns forbidden for guest sessions", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		mockGetAppSession.mockResolvedValue(
			createMockSession({
				user: { id: "guest:abc", type: "guest", email: "guest@example.com" },
			}),
		)

		const result = await voteOnMessage({
			chatId: crypto.randomUUID(),
			messageId: crypto.randomUUID(),
			type: "up",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:auth:guest_restricted")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("returns validation error for malformed vote payload", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")

		const result = await voteOnMessage({
			chatId: "not-a-uuid",
			messageId: "also-not-a-uuid",
			type: "sideways",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockGetChatById).not.toHaveBeenCalled()
	})

	it("returns forbidden for non-owner chat access", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		const { otherSession } = createMockUserPair()
		const chatId = crypto.randomUUID()
		const messageId = crypto.randomUUID()

		mockGetAppSession.mockResolvedValue(otherSession)
		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))

		const result = await voteOnMessage({ chatId, messageId, type: "up" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("forbidden:chat:owner_mismatch")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("returns not_found when message does not belong to chat", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		const chatId = crypto.randomUUID()
		const messageId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockGetMessageById.mockResolvedValue(
			createMockMessage({ id: messageId, chatId: crypto.randomUUID() }),
		)

		const result = await voteOnMessage({ chatId, messageId, type: "up" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("not_found:vote:message_not_in_chat")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("returns rate limit error when threshold is exceeded", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		const chatId = crypto.randomUUID()
		const messageId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockGetMessageById.mockResolvedValue(createMockMessage({ id: messageId, chatId }))
		mockIncr.mockResolvedValue(21)

		const result = await voteOnMessage({ chatId, messageId, type: "up" })

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("rate_limit:vote:too_many_requests")
		}
		expect(mockUpsertVote).not.toHaveBeenCalled()
	})

	it("upserts an upvote and invalidates vote cache for owner", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		const chatId = crypto.randomUUID()
		const messageId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockGetMessageById.mockResolvedValue(createMockMessage({ id: messageId, chatId }))

		const result = await voteOnMessage({ chatId, messageId, type: "up" })

		expect(result).toEqual({
			success: true,
			data: { messageId, type: "up" },
		})
		expect(mockUpsertVote).toHaveBeenCalledWith({
			chatId,
			messageId,
			userId: TEST_USER_ID,
			isUpvoted: true,
		})
		expect(mockInvalidateVotes).toHaveBeenCalledWith(chatId)
	})

	it("upserts a downvote for owner", async () => {
		const { voteOnMessage } = await import("@/features/voting/actions/vote")
		const chatId = crypto.randomUUID()
		const messageId = crypto.randomUUID()

		mockGetChatById.mockResolvedValue(createMockChat({ id: chatId, userId: TEST_USER_ID }))
		mockGetMessageById.mockResolvedValue(createMockMessage({ id: messageId, chatId }))

		const result = await voteOnMessage({ chatId, messageId, type: "down" })

		expect(result).toEqual({
			success: true,
			data: { messageId, type: "down" },
		})
		expect(mockUpsertVote).toHaveBeenCalledWith({
			chatId,
			messageId,
			userId: TEST_USER_ID,
			isUpvoted: false,
		})
	})
})
