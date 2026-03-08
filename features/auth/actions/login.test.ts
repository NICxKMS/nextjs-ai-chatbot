// Flow: auth-login | Step: login-action

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
	cookies: vi.fn(),
	headers: vi.fn(),
}))

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}))

vi.mock("@/features/auth/lib/supabase-action", () => ({
	createSupabaseActionClient: vi.fn(),
}))

vi.mock("@/features/auth/lib/action-utils", () => ({
	enforceAuthRateLimit: vi.fn(),
	authServiceUnavailableResult: vi.fn(),
	migrateGuestChatsAndClearToken: vi.fn(),
}))

vi.mock("@/lib/data/user", () => ({
	getUserById: vi.fn(),
	createUser: vi.fn(),
	updateUserLastLogin: vi.fn(),
}))

vi.mock("@/lib/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}))

// ── Imports (after mocks) ────────────────────────────────────

import { redirect } from "next/navigation"
import { login } from "@/features/auth/actions/login"
import {
	authServiceUnavailableResult,
	enforceAuthRateLimit,
	migrateGuestChatsAndClearToken,
} from "@/features/auth/lib/action-utils"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import { createUser, getUserById, updateUserLastLogin } from "@/lib/data/user"
import type { ActionResult } from "@/lib/types/result.types"
import { logger } from "@/lib/utils/logger"

const mockCreateSupabaseActionClient = createSupabaseActionClient as ReturnType<typeof vi.fn>
const mockEnforceAuthRateLimit = enforceAuthRateLimit as ReturnType<typeof vi.fn>
const mockAuthServiceUnavailableResult = authServiceUnavailableResult as ReturnType<typeof vi.fn>
const mockMigrateGuestChatsAndClearToken = migrateGuestChatsAndClearToken as ReturnType<
	typeof vi.fn
>
const mockGetUserById = getUserById as ReturnType<typeof vi.fn>
const mockCreateUser = createUser as ReturnType<typeof vi.fn>
const mockUpdateUserLastLogin = updateUserLastLogin as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>
const mockLogger = logger as unknown as Record<string, ReturnType<typeof vi.fn>>

const prevState: ActionResult<AuthActionData> = { success: true, data: undefined }

function makeFormData(email: string, password: string): FormData {
	const fd = new FormData()
	fd.set("email", email)
	fd.set("password", password)
	return fd
}

function createMockSupabase(signInResult: { data: unknown; error: unknown }) {
	return {
		auth: {
			signInWithPassword: vi.fn().mockResolvedValue(signInResult),
		},
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	// Default: rate limit passes
	mockEnforceAuthRateLimit.mockResolvedValue(null)
	// Default: updateUserLastLogin does nothing
	mockUpdateUserLastLogin.mockResolvedValue(undefined)
	// Default: migrateGuestChatsAndClearToken does nothing
	mockMigrateGuestChatsAndClearToken.mockResolvedValue(undefined)
})

describe("login", () => {
	it("returns validation error for invalid email", async () => {
		const result = await login(prevState, makeFormData("bad-email", "password123"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid email or password format",
			},
		})
		expect(mockEnforceAuthRateLimit).not.toHaveBeenCalled()
	})

	it("returns validation error for short password", async () => {
		const result = await login(prevState, makeFormData("user@example.com", "12345"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid email or password format",
			},
		})
	})

	it("returns rate limit error when rate limited", async () => {
		const rateLimitError = {
			success: false,
			error: {
				code: "rate_limit:auth:login_too_many",
				message: "Too many login attempts. Please try again later.",
			},
		}
		mockEnforceAuthRateLimit.mockResolvedValue(rateLimitError)

		const result = await login(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual(rateLimitError)
		expect(mockCreateSupabaseActionClient).not.toHaveBeenCalled()
	})

	it("returns service unavailable when Supabase client is null", async () => {
		mockCreateSupabaseActionClient.mockResolvedValue(null)
		const unavailableResult = {
			success: false,
			error: {
				code: "offline:api:service_unavailable",
				message: "Auth service is unavailable",
			},
		}
		mockAuthServiceUnavailableResult.mockReturnValue(unavailableResult)

		const result = await login(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual(unavailableResult)
	})

	it("returns error on invalid credentials", async () => {
		const supabase = createMockSupabase({
			data: { user: null },
			error: { message: "Invalid login credentials" },
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)

		const result = await login(prevState, makeFormData("user@example.com", "wrong-pass"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "unauthorized:auth:no_session",
				message: "Invalid email or password",
			},
		})
	})

	it("redirects on successful login with existing user", async () => {
		const user = { id: "user-123", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: {} },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockGetUserById.mockResolvedValue(user)

		await login(prevState, makeFormData("user@example.com", "password123"))

		expect(mockRedirect).toHaveBeenCalledWith("/")
		expect(mockMigrateGuestChatsAndClearToken).toHaveBeenCalledWith("user-123", "login")
	})

	it("reconciles user record when user exists in Supabase but not in local DB", async () => {
		const user = { id: "user-123", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: {} },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockGetUserById.mockResolvedValue(null)
		mockCreateUser.mockResolvedValue(user)

		await login(prevState, makeFormData("user@example.com", "password123"))

		expect(mockCreateUser).toHaveBeenCalledWith({
			id: "user-123",
			email: "user@example.com",
		})
		expect(mockRedirect).toHaveBeenCalledWith("/")
	})

	it("continues login even when D012 reconciliation fails", async () => {
		const user = { id: "user-123", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: {} },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockGetUserById.mockRejectedValue(new Error("DB unavailable"))

		await login(prevState, makeFormData("user@example.com", "password123"))

		expect(mockRedirect).toHaveBeenCalledWith("/")
		expect(mockLogger.error).toHaveBeenCalledWith("[login] D012 reconciliation failed", {
			error: "Error: DB unavailable",
		})
	})

	it("tracks last login for authenticated user", async () => {
		const user = { id: "user-123", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: {} },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockGetUserById.mockResolvedValue(user)

		await login(prevState, makeFormData("user@example.com", "password123"))

		expect(mockUpdateUserLastLogin).toHaveBeenCalledWith("user-123")
	})

	it("returns validation error when FormData fields are missing", async () => {
		const fd = new FormData()

		const result = await login(prevState, fd)

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid email or password format",
			},
		})
	})
})
