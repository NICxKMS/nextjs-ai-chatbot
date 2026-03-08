// Flow: data-access | Step: artifact-chat-lookup
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

import { createMockDb } from "@/__tests__/mocks/db"
import { AppError } from "@/lib/errors/app-error"

// ── Mocks ────────────────────────────────────────────────────
const mockDb = createMockDb()

vi.mock("@/lib/db/client", () => ({ db: mockDb }))
vi.mock("@/lib/db/schema", () => ({
	artifacts: {
		id: "id",
		chatId: "chatId",
		userId: "userId",
		createdAt: "createdAt",
	},
}))

// Import after mocks are registered
const { getLatestArtifactByChatId } = await import("@/lib/data/artifact-chat")

// ── Fixtures ─────────────────────────────────────────────────
const CHAT_ID = "chat-abc-123"
const USER_ID = "user-xyz-789"
const ARTIFACT_REF = { id: "artifact-001" }

// ── Helpers ──────────────────────────────────────────────────
function resetChain() {
	for (const method of Object.keys(mockDb)) {
		const fn = mockDb[method as keyof typeof mockDb] as MockInstance
		fn.mockReturnThis()
	}
}

// ── Tests ────────────────────────────────────────────────────
describe("getLatestArtifactByChatId", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		resetChain()
	})

	it("returns the latest artifact reference for a chat", async () => {
		mockDb.limit.mockResolvedValue([ARTIFACT_REF])

		const result = await getLatestArtifactByChatId(CHAT_ID, USER_ID)

		expect(result).toEqual(ARTIFACT_REF)
		expect(mockDb.select).toHaveBeenCalled()
		expect(mockDb.from).toHaveBeenCalled()
		expect(mockDb.where).toHaveBeenCalled()
		expect(mockDb.orderBy).toHaveBeenCalled()
		expect(mockDb.limit).toHaveBeenCalled()
	})

	it("returns null when no artifact exists for the chat", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getLatestArtifactByChatId(CHAT_ID, USER_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("connection lost"))

		await expect(getLatestArtifactByChatId(CHAT_ID, USER_ID)).rejects.toThrow(AppError)

		await expect(getLatestArtifactByChatId(CHAT_ID, USER_ID)).rejects.toMatchObject({
			code: "internal_error:database:query_failed",
		})
	})

	it("re-throws AppError without wrapping", async () => {
		const original = AppError.internal("internal_error:database:query_failed", "Already bad")
		mockDb.limit.mockRejectedValue(original)

		await expect(getLatestArtifactByChatId(CHAT_ID, USER_ID)).rejects.toBe(original)
	})
})
