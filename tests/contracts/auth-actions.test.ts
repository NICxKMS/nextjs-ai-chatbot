import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	redirect: vi.fn(),
	cookies: vi.fn(),
	authServiceUnavailableResult: vi.fn(),
	enforceAuthRateLimit: vi.fn(),
	migrateGuestChatsAndClearToken: vi.fn(),
	createSupabaseActionClient: vi.fn(),
	createUser: vi.fn(),
	getUserById: vi.fn(),
	updateUserLastLogin: vi.fn(),
	loggerInfo: vi.fn(),
	loggerError: vi.fn(),
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))
vi.mock("@/features/auth/lib/action-utils", () => ({
	authServiceUnavailableResult: mocks.authServiceUnavailableResult,
	enforceAuthRateLimit: mocks.enforceAuthRateLimit,
	migrateGuestChatsAndClearToken: mocks.migrateGuestChatsAndClearToken,
}))
vi.mock("@/features/auth/lib/supabase-action", () => ({
	createSupabaseActionClient: mocks.createSupabaseActionClient,
}))
vi.mock("@/lib/data/user", () => ({
	createUser: mocks.createUser,
	getUserById: mocks.getUserById,
	updateUserLastLogin: mocks.updateUserLastLogin,
}))
vi.mock("@/lib/utils/logger", () => ({
	logger: { info: mocks.loggerInfo, error: mocks.loggerError },
}))

import { login } from "@/features/auth/actions/login"
import { logout } from "@/features/auth/actions/logout"
import { register } from "@/features/auth/actions/register"
import type { AuthActionData } from "@/features/auth/types/auth.types"
import type { ActionResult } from "@/lib/types/result.types"

const previousState: ActionResult<AuthActionData> = {
	success: false,
	error: { code: "bad_request:validation:invalid_input", message: "Initial state" },
}
const redirectError = new Error("NEXT_REDIRECT")

function credentialsForm(email = "user@example.com", password = "secret123") {
	const formData = new FormData()
	formData.set("email", email)
	formData.set("password", password)
	return formData
}

describe("auth action contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.redirect.mockImplementation(() => {
			throw redirectError
		})
		mocks.enforceAuthRateLimit.mockResolvedValue(null)
		mocks.authServiceUnavailableResult.mockReturnValue({
			success: false,
			error: {
				code: "offline:api:service_unavailable",
				message: "Auth service is unavailable",
			},
		})
		mocks.migrateGuestChatsAndClearToken.mockResolvedValue(undefined)
		mocks.createUser.mockResolvedValue(undefined)
		mocks.getUserById.mockResolvedValue({ id: "user-1" })
		mocks.updateUserLastLogin.mockResolvedValue(undefined)
		mocks.cookies.mockResolvedValue({ delete: vi.fn() })
	})

	it("login validates input before rate limit or Supabase work", async () => {
		await expect(login(previousState, credentialsForm("bad", "short"))).resolves.toMatchObject({
			success: false,
			error: { code: "bad_request:validation:invalid_input" },
		})
		expect(mocks.enforceAuthRateLimit).not.toHaveBeenCalled()
		expect(mocks.createSupabaseActionClient).not.toHaveBeenCalled()
	})

	it("login returns the shared rate limit result", async () => {
		mocks.enforceAuthRateLimit.mockResolvedValue({
			success: false,
			error: { code: "rate_limit:auth:login_too_many", message: "Too many" },
		})

		await expect(login(previousState, credentialsForm())).resolves.toMatchObject({
			error: { code: "rate_limit:auth:login_too_many" },
		})
		expect(mocks.createSupabaseActionClient).not.toHaveBeenCalled()
	})

	it("login returns service unavailable when validation passes but Supabase is unavailable", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue(null)

		await expect(login(previousState, credentialsForm())).resolves.toMatchObject({
			success: false,
			error: { code: "offline:api:service_unavailable" },
		})
		expect(mocks.authServiceUnavailableResult).toHaveBeenCalled()
	})

	it("login maps Supabase invalid credentials to unauthorized without migration", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signInWithPassword: vi.fn().mockResolvedValue({
					data: { user: null },
					error: new Error("Invalid login credentials"),
				}),
			},
		})

		await expect(login(previousState, credentialsForm())).resolves.toMatchObject({
			success: false,
			error: { code: "unauthorized:auth:no_session" },
		})
		expect(mocks.migrateGuestChatsAndClearToken).not.toHaveBeenCalled()
	})

	it("login redirects after successful sign-in and guest migration", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signInWithPassword: vi.fn().mockResolvedValue({
					data: { user: { id: "user-1", email: "USER@EXAMPLE.COM" } },
					error: null,
				}),
			},
		})

		await expect(login(previousState, credentialsForm())).rejects.toThrow(redirectError)
		expect(mocks.migrateGuestChatsAndClearToken).toHaveBeenCalledWith("user-1", "login")
		expect(mocks.updateUserLastLogin).toHaveBeenCalledWith("user-1")
		expect(mocks.redirect).toHaveBeenCalledWith("/")
	})

	it("register returns confirmation state without guest migration when Supabase has no session", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signUp: vi.fn().mockResolvedValue({
					data: { user: { id: "user-2" }, session: null },
					error: null,
				}),
			},
		})

		await expect(register(previousState, credentialsForm())).resolves.toEqual({
			success: true,
			data: { confirmationRequired: true },
		})
		expect(mocks.createUser).toHaveBeenCalledWith({ id: "user-2", email: "user@example.com" })
		expect(mocks.migrateGuestChatsAndClearToken).not.toHaveBeenCalled()
	})

	it("register validates input before rate limit or Supabase work", async () => {
		await expect(
			register(previousState, credentialsForm("bad", "short")),
		).resolves.toMatchObject({
			success: false,
			error: { code: "bad_request:validation:invalid_input" },
		})
		expect(mocks.enforceAuthRateLimit).not.toHaveBeenCalled()
		expect(mocks.createSupabaseActionClient).not.toHaveBeenCalled()
	})

	it("register returns service unavailable when Supabase is unavailable", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue(null)

		await expect(register(previousState, credentialsForm())).resolves.toMatchObject({
			success: false,
			error: { code: "offline:api:service_unavailable" },
		})
		expect(mocks.authServiceUnavailableResult).toHaveBeenCalled()
	})

	it("register surfaces Supabase duplicate or provider errors", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signUp: vi.fn().mockResolvedValue({
					data: { user: null, session: null },
					error: new Error("User already registered"),
				}),
			},
		})

		await expect(register(previousState, credentialsForm())).resolves.toMatchObject({
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "User already registered",
			},
		})
		expect(mocks.createUser).not.toHaveBeenCalled()
	})

	it("register reports duplicate local user creation as profile setup failure", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signUp: vi.fn().mockResolvedValue({
					data: { user: { id: "user-4" }, session: null },
					error: null,
				}),
			},
		})
		mocks.createUser.mockRejectedValue(new Error("duplicate key"))

		await expect(register(previousState, credentialsForm())).resolves.toMatchObject({
			success: false,
			error: { code: "internal_error:database:query_failed" },
		})
		expect(mocks.migrateGuestChatsAndClearToken).not.toHaveBeenCalled()
	})

	it("register redirects and migrates guest data when Supabase creates a session", async () => {
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signUp: vi.fn().mockResolvedValue({
					data: { user: { id: "user-3" }, session: { access_token: "token" } },
					error: null,
				}),
			},
		})

		await expect(register(previousState, credentialsForm())).rejects.toThrow(redirectError)
		expect(mocks.migrateGuestChatsAndClearToken).toHaveBeenCalledWith("user-3", "register")
		expect(mocks.redirect).toHaveBeenCalledWith("/")
	})

	it("logout clears local guest state and redirects even without Supabase", async () => {
		const deleteCookie = vi.fn()
		mocks.cookies.mockResolvedValue({ delete: deleteCookie })
		mocks.createSupabaseActionClient.mockResolvedValue(null)

		await expect(logout()).rejects.toThrow(redirectError)
		expect(deleteCookie).toHaveBeenCalledWith("guest_token")
		expect(mocks.redirect).toHaveBeenCalledWith("/login")
	})

	it("logout still clears local guest state and redirects when Supabase signOut rejects", async () => {
		const deleteCookie = vi.fn()
		mocks.cookies.mockResolvedValue({ delete: deleteCookie })
		mocks.createSupabaseActionClient.mockResolvedValue({
			auth: {
				signOut: vi.fn().mockRejectedValue(new Error("signOut failed")),
			},
		})

		await expect(logout()).rejects.toThrow(redirectError)
		expect(mocks.loggerError).toHaveBeenCalledTimes(1)
		expect(deleteCookie).toHaveBeenCalledWith("guest_token")
		expect(mocks.redirect).toHaveBeenCalledWith("/login")
	})
})
