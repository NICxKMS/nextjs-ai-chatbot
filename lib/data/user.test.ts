// Flow: data-access | Step: user-queries
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors/app-error"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => {
	const chain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
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
	insert: ReturnType<typeof vi.fn>
	values: ReturnType<typeof vi.fn>
	update: ReturnType<typeof vi.fn>
	set: ReturnType<typeof vi.fn>
	delete: ReturnType<typeof vi.fn>
	returning: ReturnType<typeof vi.fn>
	onConflictDoNothing: ReturnType<typeof vi.fn>
	execute: ReturnType<typeof vi.fn>
}

import {
	createUser,
	deleteGuestUser,
	ensureGuestUser,
	getUserById,
	updateUserLastLogin,
} from "./user"

// ── Fixtures ─────────────────────────────────────────────────

const USER_ID = "u0000000-0000-0000-0000-000000000001"
const NOW = new Date("2026-01-01T00:00:00Z")

const mockUser = {
	id: USER_ID,
	email: "test@example.com",
	passwordHash: "hashed",
	createdAt: NOW,
	lastLogin: NOW,
}

const mockUserWithoutHash = {
	id: USER_ID,
	email: "test@example.com",
	createdAt: NOW,
	lastLogin: NOW,
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
	mockDb.onConflictDoNothing.mockResolvedValue(undefined)
	mockDb.execute.mockResolvedValue([])
}

beforeEach(() => {
	resetChainMocks()
})

// ── Tests ────────────────────────────────────────────────────

describe("getUserById", () => {
	it("returns user without passwordHash when found", async () => {
		mockDb.limit.mockResolvedValue([mockUserWithoutHash])

		const result = await getUserById(USER_ID)

		expect(result).toEqual(mockUserWithoutHash)
		expect(result).not.toHaveProperty("passwordHash")
		expect(mockDb.select).toHaveBeenCalledOnce()
	})

	it("returns null when user not found", async () => {
		mockDb.limit.mockResolvedValue([])

		const result = await getUserById(USER_ID)

		expect(result).toBeNull()
	})

	it("throws AppError on database failure", async () => {
		mockDb.limit.mockRejectedValue(new Error("connection refused"))

		await expect(getUserById(USER_ID)).rejects.toThrow(AppError)
	})
})

describe("createUser", () => {
	it("inserts and returns the created user", async () => {
		mockDb.returning.mockResolvedValue([mockUser])

		const result = await createUser({
			id: USER_ID,
			email: "test@example.com",
			passwordHash: "hashed",
		})

		expect(result).toEqual(mockUser)
		expect(mockDb.insert).toHaveBeenCalledOnce()
		expect(mockDb.values).toHaveBeenCalledOnce()
	})

	it("throws AppError when insert returns no rows", async () => {
		mockDb.returning.mockResolvedValue([undefined])

		await expect(
			createUser({ id: USER_ID, email: "test@example.com", passwordHash: "x" }),
		).rejects.toThrow(AppError)
	})

	it("throws AppError on database failure", async () => {
		mockDb.returning.mockRejectedValue(new Error("unique constraint"))

		await expect(
			createUser({ id: USER_ID, email: "test@example.com", passwordHash: "x" }),
		).rejects.toThrow(AppError)
	})
})

describe("updateUserLastLogin", () => {
	it("updates lastLogin timestamp", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await updateUserLastLogin(USER_ID)

		expect(mockDb.update).toHaveBeenCalledOnce()
		expect(mockDb.set).toHaveBeenCalledOnce()
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("timeout"))

		await expect(updateUserLastLogin(USER_ID)).rejects.toThrow(AppError)
	})
})

describe("ensureGuestUser", () => {
	it("inserts guest user with onConflictDoNothing", async () => {
		await ensureGuestUser(USER_ID)

		expect(mockDb.insert).toHaveBeenCalledOnce()
		expect(mockDb.values).toHaveBeenCalledWith({ id: USER_ID })
		expect(mockDb.onConflictDoNothing).toHaveBeenCalledOnce()
	})

	it("does not throw when user already exists (conflict handled)", async () => {
		mockDb.onConflictDoNothing.mockResolvedValue(undefined)

		await expect(ensureGuestUser(USER_ID)).resolves.toBeUndefined()
	})

	it("throws AppError on database failure", async () => {
		mockDb.onConflictDoNothing.mockRejectedValue(new Error("connection lost"))

		await expect(ensureGuestUser(USER_ID)).rejects.toThrow(AppError)
	})
})

describe("deleteGuestUser", () => {
	it("deletes the guest user row", async () => {
		mockDb.where.mockResolvedValue(undefined)

		await deleteGuestUser(USER_ID)

		expect(mockDb.delete).toHaveBeenCalledOnce()
		expect(mockDb.where).toHaveBeenCalledOnce()
	})

	it("throws AppError on database failure", async () => {
		mockDb.where.mockRejectedValue(new Error("connection refused"))

		await expect(deleteGuestUser(USER_ID)).rejects.toThrow(AppError)
	})
})
