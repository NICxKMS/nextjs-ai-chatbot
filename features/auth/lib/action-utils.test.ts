// Flow: auth-actions | Step: action-helpers

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
	cookies: vi.fn(),
	headers: vi.fn(),
}))

vi.mock("@/lib/cache/rate-limit", () => ({
	checkRateLimit: vi.fn(),
}))

vi.mock("@/lib/auth/guest", () => ({
	verifyGuestToken: vi.fn(),
}))

vi.mock("@/lib/data/chat", () => ({
	transferGuestChats: vi.fn(),
}))

vi.mock("@/lib/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}))

vi.mock("@/lib/data/user", () => ({
	deleteGuestUser: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { cookies, headers } from "next/headers"
import { createMockCookies, createMockHeaders } from "@/__tests__/mocks/next-headers"
import {
	authServiceUnavailableResult,
	enforceAuthRateLimit,
	migrateGuestChatsAndClearToken,
} from "@/features/auth/lib/action-utils"
import { verifyGuestToken } from "@/lib/auth/guest"
import { checkRateLimit } from "@/lib/cache/rate-limit"
import { transferGuestChats } from "@/lib/data/chat"
import { deleteGuestUser } from "@/lib/data/user"
import { logger } from "@/lib/utils/logger"

const mockCookies = cookies as ReturnType<typeof vi.fn>
const mockHeaders = headers as ReturnType<typeof vi.fn>
const mockCheckRateLimit = checkRateLimit as ReturnType<typeof vi.fn>
const mockVerifyGuestToken = verifyGuestToken as ReturnType<typeof vi.fn>
const mockTransferGuestChats = transferGuestChats as ReturnType<typeof vi.fn>
const mockDeleteGuestUser = deleteGuestUser as ReturnType<typeof vi.fn>
const mockLogger = logger as unknown as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
	vi.clearAllMocks()
})

// ── authServiceUnavailableResult ─────────────────────────────

describe("authServiceUnavailableResult", () => {
	it("returns correct error result shape", () => {
		const result = authServiceUnavailableResult()
		expect(result).toEqual({
			success: false,
			error: {
				code: "offline:api:service_unavailable",
				message: "Auth service is unavailable",
			},
		})
	})
})

// ── enforceAuthRateLimit ─────────────────────────────────────

describe("enforceAuthRateLimit", () => {
	const config = {
		createKey: (ip: string) => `rate-limit-login:${ip}`,
		limit: 5,
		windowSeconds: 60,
		errorCode: "rate_limit:auth:login_too_many" as const,
		errorMessage: "Too many login attempts. Please try again later.",
	}

	it("returns null when rate limit is not exceeded", async () => {
		const mockHeaderStore = createMockHeaders()
		mockHeaderStore._store.set("x-forwarded-for", "192.168.1.1")
		mockHeaders.mockResolvedValue(mockHeaderStore)
		mockCheckRateLimit.mockResolvedValue(true)

		const result = await enforceAuthRateLimit(config)
		expect(result).toBeNull()
		expect(mockCheckRateLimit).toHaveBeenCalledWith("rate-limit-login:192.168.1.1", 5, 60)
	})

	it("returns error result when rate limit is exceeded", async () => {
		const mockHeaderStore = createMockHeaders()
		mockHeaderStore._store.set("x-forwarded-for", "192.168.1.1")
		mockHeaders.mockResolvedValue(mockHeaderStore)
		mockCheckRateLimit.mockResolvedValue(false)

		const result = await enforceAuthRateLimit(config)
		expect(result).toEqual({
			success: false,
			error: {
				code: "rate_limit:auth:login_too_many",
				message: "Too many login attempts. Please try again later.",
			},
		})
	})

	it("uses 'unknown' when x-forwarded-for header is missing", async () => {
		const mockHeaderStore = createMockHeaders()
		mockHeaders.mockResolvedValue(mockHeaderStore)
		mockCheckRateLimit.mockResolvedValue(true)

		await enforceAuthRateLimit(config)
		expect(mockCheckRateLimit).toHaveBeenCalledWith("rate-limit-login:unknown", 5, 60)
	})

	it("extracts first IP from comma-separated x-forwarded-for", async () => {
		const mockHeaderStore = createMockHeaders()
		mockHeaderStore._store.set("x-forwarded-for", "10.0.0.1, 10.0.0.2, 10.0.0.3")
		mockHeaders.mockResolvedValue(mockHeaderStore)
		mockCheckRateLimit.mockResolvedValue(true)

		await enforceAuthRateLimit(config)
		expect(mockCheckRateLimit).toHaveBeenCalledWith("rate-limit-login:10.0.0.1", 5, 60)
	})
})

// ── migrateGuestChatsAndClearToken ───────────────────────────

describe("migrateGuestChatsAndClearToken", () => {
	it("does nothing when no guest token cookie exists", async () => {
		const mockCookieStore = createMockCookies()
		mockCookies.mockResolvedValue(mockCookieStore)

		await migrateGuestChatsAndClearToken("user-123", "login")
		expect(mockVerifyGuestToken).not.toHaveBeenCalled()
		expect(mockTransferGuestChats).not.toHaveBeenCalled()
	})

	it("migrates guest chats and clears cookie when token and userId exist", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "valid-token" })
		mockCookies.mockResolvedValue(mockCookieStore)
		mockVerifyGuestToken.mockResolvedValue({ userId: "guest-id" })
		mockTransferGuestChats.mockResolvedValue(3)

		await migrateGuestChatsAndClearToken("user-123", "login")

		expect(mockVerifyGuestToken).toHaveBeenCalledWith("valid-token")
		expect(mockTransferGuestChats).toHaveBeenCalledWith("guest-id", "user-123")
		expect(mockDeleteGuestUser).toHaveBeenCalledWith("guest-id")
		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("[login] Migrated 3 guest chat(s)"),
		)
	})

	it("clears cookie even when userId is null", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "valid-token" })
		mockCookies.mockResolvedValue(mockCookieStore)

		await migrateGuestChatsAndClearToken(null, "register")

		expect(mockVerifyGuestToken).not.toHaveBeenCalled()
		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
	})

	it("clears cookie even when verifyGuestToken returns null", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "bad-token" })
		mockCookies.mockResolvedValue(mockCookieStore)
		mockVerifyGuestToken.mockResolvedValue(null)

		await migrateGuestChatsAndClearToken("user-123", "login")

		expect(mockTransferGuestChats).not.toHaveBeenCalled()
		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
	})

	it("clears cookie even when migration throws", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "valid-token" })
		mockCookies.mockResolvedValue(mockCookieStore)
		mockVerifyGuestToken.mockRejectedValue(new Error("Verify failed"))

		await migrateGuestChatsAndClearToken("user-123", "login")

		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
		expect(mockLogger.error).toHaveBeenCalledWith("[login] Guest data migration failed", {
			error: "Error: Verify failed",
		})
	})

	it("does not log when zero chats are migrated", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "valid-token" })
		mockCookies.mockResolvedValue(mockCookieStore)
		mockVerifyGuestToken.mockResolvedValue({ userId: "guest-id" })
		mockTransferGuestChats.mockResolvedValue(0)

		await migrateGuestChatsAndClearToken("user-123", "login")

		expect(mockLogger.info).not.toHaveBeenCalled()
		expect(mockDeleteGuestUser).toHaveBeenCalledWith("guest-id")
	})

	it("logs warning when deleteGuestUser fails", async () => {
		const mockCookieStore = createMockCookies()
		mockCookieStore._store.set("guest_token", { value: "valid-token" })
		mockCookies.mockResolvedValue(mockCookieStore)
		mockVerifyGuestToken.mockResolvedValue({ userId: "guest-id" })
		mockTransferGuestChats.mockResolvedValue(1)
		mockDeleteGuestUser.mockRejectedValue(new Error("DB delete failed"))

		await migrateGuestChatsAndClearToken("user-123", "login")

		expect(mockDeleteGuestUser).toHaveBeenCalledWith("guest-id")
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"[login] Failed to delete orphaned guest user",
			{ guestUserId: "guest-id" },
		)
		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
	})
})
