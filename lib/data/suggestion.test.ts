// Flow: data-access | Step: suggestion-queries
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

import { createMockDb } from "@/__tests__/mocks/db"
import { AppError } from "@/lib/errors/app-error"

// ── Mocks ────────────────────────────────────────────────────
const mockDb = createMockDb()

vi.mock("@/lib/db/client", () => ({ db: mockDb }))
vi.mock("@/lib/db/schema", () => ({
	suggestions: {
		artifactId: "artifactId",
		artifactCreatedAt: "artifactCreatedAt",
	},
}))

// Import after mocks are registered
const { getSuggestionsByArtifactVersion, saveSuggestions } = await import("@/lib/data/suggestion")

// ── Fixtures ─────────────────────────────────────────────────
const ARTIFACT_ID = "artifact-abc-123"
const ARTIFACT_CREATED_AT = new Date("2026-01-15T12:00:00Z")

const mockSuggestion = {
	id: "sug-001",
	artifactId: ARTIFACT_ID,
	artifactCreatedAt: ARTIFACT_CREATED_AT,
	originalText: "Hello world",
	suggestedText: "Hello, world!",
	description: "Add comma and exclamation",
	isResolved: false,
	userId: "user-xyz-789",
	createdAt: new Date("2026-01-15T12:05:00Z"),
}

// ── Helpers ──────────────────────────────────────────────────
function resetChain() {
	for (const method of Object.keys(mockDb)) {
		const fn = mockDb[method as keyof typeof mockDb] as MockInstance
		fn.mockReturnThis()
	}
}

// ── Tests ────────────────────────────────────────────────────
describe("getSuggestionsByArtifactVersion", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		resetChain()
	})

	it("returns suggestions for an artifact version", async () => {
		const suggestions = [mockSuggestion]
		mockDb.where.mockResolvedValue(suggestions)

		const result = await getSuggestionsByArtifactVersion(ARTIFACT_ID, ARTIFACT_CREATED_AT)

		expect(result).toEqual(suggestions)
		expect(mockDb.select).toHaveBeenCalled()
		expect(mockDb.from).toHaveBeenCalled()
		expect(mockDb.where).toHaveBeenCalled()
	})

	it("returns empty array when no suggestions exist", async () => {
		mockDb.where.mockResolvedValue([])

		const result = await getSuggestionsByArtifactVersion(ARTIFACT_ID, ARTIFACT_CREATED_AT)

		expect(result).toEqual([])
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("timeout"))

		await expect(
			getSuggestionsByArtifactVersion(ARTIFACT_ID, ARTIFACT_CREATED_AT),
		).rejects.toThrow(AppError)

		await expect(
			getSuggestionsByArtifactVersion(ARTIFACT_ID, ARTIFACT_CREATED_AT),
		).rejects.toMatchObject({
			code: "internal_error:database:query_failed",
		})
	})

	it("re-throws AppError without wrapping", async () => {
		const original = AppError.internal("internal_error:database:query_failed", "Upstream")
		mockDb.where.mockRejectedValue(original)

		await expect(
			getSuggestionsByArtifactVersion(ARTIFACT_ID, ARTIFACT_CREATED_AT),
		).rejects.toBe(original)
	})
})

describe("saveSuggestions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		resetChain()
	})

	it("batch inserts suggestions and returns them", async () => {
		const input = [
			{
				artifactId: ARTIFACT_ID,
				artifactCreatedAt: ARTIFACT_CREATED_AT,
				originalText: "foo",
				suggestedText: "bar",
				userId: "user-xyz-789",
			},
		]
		mockDb.returning.mockResolvedValue([mockSuggestion])

		const result = await saveSuggestions(input)

		expect(result).toEqual([mockSuggestion])
		expect(mockDb.insert).toHaveBeenCalled()
		expect(mockDb.values).toHaveBeenCalled()
		expect(mockDb.returning).toHaveBeenCalled()
	})

	it("returns empty array for empty input without touching DB", async () => {
		const result = await saveSuggestions([])

		expect(result).toEqual([])
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("constraint violation"))

		await expect(
			saveSuggestions([
				{
					artifactId: ARTIFACT_ID,
					artifactCreatedAt: ARTIFACT_CREATED_AT,
					originalText: "a",
					suggestedText: "b",
					userId: "user-1",
				},
			]),
		).rejects.toThrow(AppError)
	})

	it("re-throws AppError without double-wrapping", async () => {
		const original = AppError.internal("internal_error:database:query_failed", "Already")
		mockDb.returning.mockRejectedValue(original)

		await expect(
			saveSuggestions([
				{
					artifactId: ARTIFACT_ID,
					artifactCreatedAt: ARTIFACT_CREATED_AT,
					originalText: "a",
					suggestedText: "b",
					userId: "user-1",
				},
			]),
		).rejects.toBe(original)
	})
})
