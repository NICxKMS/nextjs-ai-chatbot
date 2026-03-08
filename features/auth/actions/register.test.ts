// Flow: auth-register | Step: register-action

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
	createUser: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { redirect } from "next/navigation"
import { register } from "@/features/auth/actions/register"
import {
	authServiceUnavailableResult,
	enforceAuthRateLimit,
	migrateGuestChatsAndClearToken,
} from "@/features/auth/lib/action-utils"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import { createUser } from "@/lib/data/user"
import type { ActionResult } from "@/lib/types/result.types"

const mockCreateSupabaseActionClient = createSupabaseActionClient as ReturnType<typeof vi.fn>
const mockEnforceAuthRateLimit = enforceAuthRateLimit as ReturnType<typeof vi.fn>
const mockAuthServiceUnavailableResult = authServiceUnavailableResult as ReturnType<typeof vi.fn>
const mockMigrateGuestChatsAndClearToken = migrateGuestChatsAndClearToken as ReturnType<
	typeof vi.fn
>
const mockCreateUser = createUser as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>

const prevState: ActionResult<AuthActionData> = { success: true, data: undefined }

function makeFormData(email: string, password: string): FormData {
	const fd = new FormData()
	fd.set("email", email)
	fd.set("password", password)
	return fd
}

function createMockSupabase(signUpResult: { data: unknown; error: unknown }) {
	return {
		auth: {
			signUp: vi.fn().mockResolvedValue(signUpResult),
		},
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	mockEnforceAuthRateLimit.mockResolvedValue(null)
	mockMigrateGuestChatsAndClearToken.mockResolvedValue(undefined)
})

describe("register", () => {
	it("returns validation error for invalid email", async () => {
		const result = await register(prevState, makeFormData("bad-email", "password123"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid registration data",
			},
		})
		expect(mockEnforceAuthRateLimit).not.toHaveBeenCalled()
	})

	it("returns validation error for short password", async () => {
		const result = await register(prevState, makeFormData("user@example.com", "12345"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid registration data",
			},
		})
	})

	it("returns rate limit error when rate limited", async () => {
		const rateLimitError = {
			success: false,
			error: {
				code: "rate_limit:auth:register_too_many",
				message: "Too many registration attempts. Please try again later.",
			},
		}
		mockEnforceAuthRateLimit.mockResolvedValue(rateLimitError)

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

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

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual(unavailableResult)
	})

	it("returns error when Supabase signUp fails", async () => {
		const supabase = createMockSupabase({
			data: { user: null },
			error: { message: "User already registered" },
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "User already registered",
			},
		})
	})

	it("returns error when Supabase returns no user", async () => {
		const supabase = createMockSupabase({
			data: { user: null },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Failed to create account",
			},
		})
	})

	it("returns error when local DB user creation fails", async () => {
		const user = { id: "user-456", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: {} },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockCreateUser.mockRejectedValue(new Error("DB conflict"))

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual({
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Account created but profile setup failed. Please try logging in.",
			},
		})
	})

	it("returns confirmationRequired when session is absent", async () => {
		const user = { id: "user-456", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: null },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockCreateUser.mockResolvedValue(user)

		const result = await register(prevState, makeFormData("user@example.com", "password123"))

		expect(result).toEqual({
			success: true,
			data: { confirmationRequired: true },
		})
		expect(mockRedirect).not.toHaveBeenCalled()
	})

	it("redirects on successful registration with immediate session", async () => {
		const user = { id: "user-456", email: "user@example.com" }
		const supabase = createMockSupabase({
			data: { user, session: { access_token: "token" } },
			error: null,
		})
		mockCreateSupabaseActionClient.mockResolvedValue(supabase)
		mockCreateUser.mockResolvedValue(user)

		await register(prevState, makeFormData("user@example.com", "password123"))

		expect(mockCreateUser).toHaveBeenCalledWith({
			id: "user-456",
			email: "user@example.com",
		})
		expect(mockMigrateGuestChatsAndClearToken).toHaveBeenCalledWith("user-456", "register")
		expect(mockRedirect).toHaveBeenCalledWith("/")
	})

	it("returns validation error when FormData fields are missing", async () => {
		const fd = new FormData()

		const result = await register(prevState, fd)

		expect(result).toEqual({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid registration data",
			},
		})
	})
})
