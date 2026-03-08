// Flow: data-access | Step: artifact-queries
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
	return { db: chain }
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
}

import {
	deleteArtifactVersion,
	getArtifactById,
	getArtifactByIdAndCreatedAt,
	getArtifactOwnerId,
	getArtifactVersions,
	getArtifactVersionsMeta,
	saveArtifactVersion,
} from "./artifact"

// ── Fixtures ─────────────────────────────────────────────────

const ARTIFACT_ID = "a0000000-0000-0000-0000-000000000001"
const USER_ID = "u0000000-0000-0000-0000-000000000001"
const CHAT_ID = "c0000000-0000-0000-0000-000000000001"
const NOW = new Date("2026-01-01T00:00:00Z")

const mockArtifact = {
	id: ARTIFACT_ID,
	createdAt: NOW,
	title: "Test Artifact",
	content: "console.log('hello')",
	kind: "code" as const,
	userId: USER_ID,
	chatId: CHAT_ID,
	updatedAt: NOW,
}

// ── Helpers ──────────────────────────────────────────────────

function resetChainMocks() {
	for (const key of Object.keys(mockDb)) {
		const fn = mockDb[key as keyof typeof mockDb]
		if (typeof fn === "function" && "mockClear" in fn) {
			;(fn as ReturnType<typeof vi.fn>).mockClear().mockReturnThis()
		}
	}
	mockDb.returning.mockResolvedValue([])
	mockDb.execute.mockResolvedValue([])
}

beforeEach(() => {
	resetChainMocks()
})

// ── Tests ────────────────────────────────────────────────────

describe("getArtifactOwnerId", () => {
	it("returns userId when artifact exists", async () => {
		mockDb.limit.mockResolvedValue([{ userId: USER_ID }])

		const result = await getArtifactOwnerId(ARTIFACT_ID)

		expect(result).toBe(USER_ID)
	})

	it("returns null when artifact does not exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getArtifactOwnerId(ARTIFACT_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("connection refused"))

		await expect(getArtifactOwnerId(ARTIFACT_ID)).rejects.toThrow(AppError)
	})
})

describe("getArtifactVersionsMeta", () => {
	const metaRows = [
		{ id: ARTIFACT_ID, createdAt: NOW, title: "V1", kind: "code" },
		{
			id: ARTIFACT_ID,
			createdAt: new Date("2025-12-31"),
			title: "V0",
			kind: "code",
		},
	]

	it("returns metadata rows without content", async () => {
		mockDb.limit.mockResolvedValue(metaRows)

		const result = await getArtifactVersionsMeta(ARTIFACT_ID)

		expect(result).toEqual(metaRows)
		expect(mockDb.select).toHaveBeenCalledOnce()
	})

	it("returns empty array when no versions exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getArtifactVersionsMeta(ARTIFACT_ID)

		expect(result).toEqual([])
	})

	it("respects custom limit parameter", async () => {
		mockDb.limit.mockResolvedValue(metaRows)

		await getArtifactVersionsMeta(ARTIFACT_ID, 5)

		expect(mockDb.limit).toHaveBeenCalledWith(5)
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("timeout"))

		await expect(getArtifactVersionsMeta(ARTIFACT_ID)).rejects.toThrow(AppError)
	})
})

describe("getArtifactById", () => {
	it("returns the latest version of an artifact", async () => {
		mockDb.limit.mockResolvedValue([mockArtifact])

		const result = await getArtifactById(ARTIFACT_ID)

		expect(result).toEqual(mockArtifact)
	})

	it("returns null when artifact does not exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getArtifactById(ARTIFACT_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("connection error"))

		await expect(getArtifactById(ARTIFACT_ID)).rejects.toThrow(AppError)
	})
})

describe("getArtifactByIdAndCreatedAt", () => {
	it("returns artifact matching composite key", async () => {
		mockDb.limit.mockResolvedValue([mockArtifact])

		const result = await getArtifactByIdAndCreatedAt(ARTIFACT_ID, NOW)

		expect(result).toEqual(mockArtifact)
	})

	it("returns null when no match found", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getArtifactByIdAndCreatedAt(ARTIFACT_ID, NOW)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("query error"))

		await expect(getArtifactByIdAndCreatedAt(ARTIFACT_ID, NOW)).rejects.toThrow(AppError)
	})
})

describe("getArtifactVersions", () => {
	const versions = [mockArtifact, { ...mockArtifact, createdAt: new Date("2025-12-31") }]

	it("returns all versions ordered newest first", async () => {
		mockDb.limit.mockResolvedValue(versions)

		const result = await getArtifactVersions(ARTIFACT_ID)

		expect(result).toEqual(versions)
	})

	it("returns empty array when no versions exist", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getArtifactVersions(ARTIFACT_ID)

		expect(result).toEqual([])
	})

	it("respects custom limit parameter", async () => {
		mockDb.limit.mockResolvedValue(versions)

		await getArtifactVersions(ARTIFACT_ID, 50)

		expect(mockDb.limit).toHaveBeenCalledWith(50)
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("timeout"))

		await expect(getArtifactVersions(ARTIFACT_ID)).rejects.toThrow(AppError)
	})
})

describe("saveArtifactVersion", () => {
	it("inserts and returns the new artifact version", async () => {
		mockDb.returning.mockResolvedValue([mockArtifact])

		const result = await saveArtifactVersion({
			id: ARTIFACT_ID,
			title: "Test Artifact",
			content: "console.log('hello')",
			kind: "code",
			userId: USER_ID,
			chatId: CHAT_ID,
		})

		expect(result).toEqual(mockArtifact)
		expect(mockDb.insert).toHaveBeenCalledOnce()
		expect(mockDb.values).toHaveBeenCalledOnce()
	})

	it("throws AppError when insert returns no rows", async () => {
		mockDb.returning.mockResolvedValue([undefined])

		await expect(
			saveArtifactVersion({
				id: ARTIFACT_ID,
				title: "Test",
				content: "x",
				kind: "text",
				userId: USER_ID,
				chatId: CHAT_ID,
			}),
		).rejects.toThrow(AppError)
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("unique constraint"))

		await expect(
			saveArtifactVersion({
				id: ARTIFACT_ID,
				title: "Test",
				content: "x",
				kind: "text",
				userId: USER_ID,
				chatId: CHAT_ID,
			}),
		).rejects.toThrow(AppError)
	})
})

describe("deleteArtifactVersion", () => {
	it("deletes versions after the given timestamp", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await deleteArtifactVersion(ARTIFACT_ID, NOW)

		expect(mockDb.delete).toHaveBeenCalledOnce()
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("constraint violation"))

		await expect(deleteArtifactVersion(ARTIFACT_ID, NOW)).rejects.toThrow(AppError)
	})
})
