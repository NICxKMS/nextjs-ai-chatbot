import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthActionData } from "@/features/auth/types/auth.types"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import type { ActionResult } from "@/lib/types/result.types"
import { TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockHeaders = vi.fn()
const mockCookies = vi.fn()
vi.mock("next/headers", () => ({
	headers: (...args: unknown[]) => mockHeaders(...args),
	cookies: (...args: unknown[]) => mockCookies(...args),
}))

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
	redirect: (...args: unknown[]) => mockRedirect(...args),
}))

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockSupabaseClient = {
	auth: {
		signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
		signUp: (...args: unknown[]) => mockSignUp(...args),
		signOut: (...args: unknown[]) => mockSignOut(...args),
	},
}

const mockCreateServerClient = vi.fn()
vi.mock("@supabase/ssr", () => ({
	createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

const mockIncr = vi.fn()
const mockExpire = vi.fn()
vi.mock("@/lib/cache/client", () => ({
	incr: (...args: unknown[]) => mockIncr(...args),
	expire: (...args: unknown[]) => mockExpire(...args),
}))

const mockVerifyGuestToken = vi.fn()
vi.mock("@/lib/auth/guest", () => ({
	verifyGuestToken: (...args: unknown[]) => mockVerifyGuestToken(...args),
}))

const mockTransferGuestChats = vi.fn()
vi.mock("@/lib/data/chat", () => ({
	transferGuestChats: (...args: unknown[]) => mockTransferGuestChats(...args),
}))

const mockCreateUser = vi.fn()
const mockGetUserById = vi.fn()
vi.mock("@/lib/data/user", () => ({
	createUser: (...args: unknown[]) => mockCreateUser(...args),
	getUserById: (...args: unknown[]) => mockGetUserById(...args),
}))

const PREV_STATE: ActionResult<AuthActionData> = {
	success: true,
	data: undefined,
}

const REDIRECT_ERROR_MESSAGE = "NEXT_REDIRECT"
const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ORIGINAL_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type CookieEntry = { name: string; value: string }
type CookieOptions = Record<string, unknown>
type CookieStoreMock = {
	get: ReturnType<typeof vi.fn>
	getAll: ReturnType<typeof vi.fn>
	set: ReturnType<typeof vi.fn>
	delete: ReturnType<typeof vi.fn>
}

let cookieStore: CookieStoreMock

function setEnvValue(
	name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
	value: string | undefined,
): void {
	if (value === undefined) {
		delete process.env[name]
		return
	}

	process.env[name] = value
}

function restoreSupabaseEnv(): void {
	setEnvValue("NEXT_PUBLIC_SUPABASE_URL", ORIGINAL_SUPABASE_URL)
	setEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", ORIGINAL_SUPABASE_ANON_KEY)
}

function createLoginFormData(overrides?: { email?: string; password?: string }): FormData {
	const formData = new FormData()
	formData.set("email", overrides?.email ?? "test@example.com")
	formData.set("password", overrides?.password ?? "password123")
	return formData
}

function createRegisterFormData(overrides?: {
	email?: string
	password?: string
	name?: string
}): FormData {
	const formData = new FormData()
	formData.set("email", overrides?.email ?? "test@example.com")
	formData.set("password", overrides?.password ?? "password123")
	if (overrides?.name !== undefined) {
		formData.set("name", overrides.name)
	}
	return formData
}

beforeEach(() => {
	vi.resetAllMocks()
	restoreSupabaseEnv()

	cookieStore = {
		get: vi.fn().mockReturnValue(undefined),
		getAll: vi.fn().mockReturnValue([] as CookieEntry[]),
		set: vi.fn(),
		delete: vi.fn(),
	}

	mockHeaders.mockResolvedValue(new Headers([["x-forwarded-for", "127.0.0.1"]]))
	mockCookies.mockResolvedValue(cookieStore)
	mockRedirect.mockImplementation(() => {
		throw new Error(REDIRECT_ERROR_MESSAGE)
	})

	mockCreateServerClient.mockReturnValue(mockSupabaseClient)

	mockSignInWithPassword.mockResolvedValue({
		data: { user: { id: TEST_USER_ID, email: "test@example.com" } },
		error: null,
	})
	mockSignUp.mockResolvedValue({
		data: {
			user: { id: TEST_USER_ID, email: "test@example.com" },
			session: { access_token: "test-access-token" },
		},
		error: null,
	})
	mockSignOut.mockResolvedValue({ error: null })

	mockIncr.mockResolvedValue(1)
	mockExpire.mockResolvedValue(undefined)
	mockVerifyGuestToken.mockResolvedValue(null)
	mockTransferGuestChats.mockResolvedValue(0)
	mockGetUserById.mockResolvedValue({ id: TEST_USER_ID })
	mockCreateUser.mockResolvedValue(undefined)
})

afterAll(() => {
	restoreSupabaseEnv()
})

describe("login action", () => {
	it("returns validation error for invalid form data", async () => {
		const { login } = await import("@/features/auth/actions/login")

		const result = await login(
			PREV_STATE,
			createLoginFormData({ email: "not-an-email", password: "123" }),
		)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockSignInWithPassword).not.toHaveBeenCalled()
		expect(mockIncr).not.toHaveBeenCalled()
	})

	it("returns rate limit error when attempts exceed threshold", async () => {
		const { login } = await import("@/features/auth/actions/login")
		mockIncr.mockResolvedValue(6)

		const result = await login(PREV_STATE, createLoginFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("rate_limit:auth:login_too_many")
		}
		expect(mockSignInWithPassword).not.toHaveBeenCalled()
	})

	it("returns auth error for incorrect credentials", async () => {
		const { login } = await import("@/features/auth/actions/login")
		mockSignInWithPassword.mockResolvedValue({
			data: { user: null },
			error: { message: "Invalid login credentials" },
		})

		const result = await login(PREV_STATE, createLoginFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("unauthorized:auth:no_session")
			expect(result.error.message).toBe("Invalid email or password")
		}
	})

	it("redirects on success and migrates guest data when guest token exists", async () => {
		const { login } = await import("@/features/auth/actions/login")

		cookieStore.get.mockReturnValue({ name: GUEST_COOKIE_NAME, value: "guest-token" })
		mockGetUserById.mockResolvedValue(null)
		mockSignInWithPassword.mockResolvedValue({
			data: { user: { id: TEST_USER_ID, email: "UPPER@EXAMPLE.COM" } },
			error: null,
		})
		mockVerifyGuestToken.mockResolvedValue({ userId: "guest:source" })
		mockTransferGuestChats.mockResolvedValue(2)

		await expect(login(PREV_STATE, createLoginFormData())).rejects.toThrow(
			REDIRECT_ERROR_MESSAGE,
		)

		expect(mockCreateUser).toHaveBeenCalledWith({
			id: TEST_USER_ID,
			email: "upper@example.com",
		})
		expect(mockTransferGuestChats).toHaveBeenCalledWith("guest:source", TEST_USER_ID)
		expect(cookieStore.delete).toHaveBeenCalledWith(GUEST_COOKIE_NAME)
		expect(mockRedirect).toHaveBeenCalledWith("/")
	})
})

describe("logout action", () => {
	it("signs out and redirects to login", async () => {
		const { logout } = await import("@/features/auth/actions/logout")

		await expect(logout()).rejects.toThrow(REDIRECT_ERROR_MESSAGE)

		expect(mockSignOut).toHaveBeenCalledTimes(1)
		expect(cookieStore.delete).toHaveBeenCalledWith(GUEST_COOKIE_NAME)
		expect(mockRedirect).toHaveBeenCalledWith("/login")
	})

	it("redirects even when Supabase env vars are missing", async () => {
		const { logout } = await import("@/features/auth/actions/logout")
		setEnvValue("NEXT_PUBLIC_SUPABASE_URL", undefined)
		setEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined)

		await expect(logout()).rejects.toThrow(REDIRECT_ERROR_MESSAGE)

		expect(mockCreateServerClient).not.toHaveBeenCalled()
		expect(mockSignOut).not.toHaveBeenCalled()
		expect(cookieStore.delete).toHaveBeenCalledWith(GUEST_COOKIE_NAME)
		expect(mockRedirect).toHaveBeenCalledWith("/login")
	})

	it("executes signOut before redirect", async () => {
		const { logout } = await import("@/features/auth/actions/logout")

		await expect(logout()).rejects.toThrow(REDIRECT_ERROR_MESSAGE)

		const signOutOrder = Number(
			mockSignOut.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
		)
		const redirectOrder = Number(
			mockRedirect.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
		)
		expect(signOutOrder).toBeLessThan(redirectOrder)
	})
})

describe("register action", () => {
	it("returns validation error for invalid registration payload", async () => {
		const { register } = await import("@/features/auth/actions/register")

		const result = await register(
			PREV_STATE,
			createRegisterFormData({ email: "bad-email", password: "123" }),
		)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
		}
		expect(mockSignUp).not.toHaveBeenCalled()
	})

	it("returns signup error when Supabase rejects registration", async () => {
		const { register } = await import("@/features/auth/actions/register")
		mockSignUp.mockResolvedValue({
			data: { user: null, session: null },
			error: { message: "User already registered" },
		})

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("bad_request:validation:invalid_input")
			expect(result.error.message).toBe("User already registered")
		}
	})

	it("returns confirmationRequired when signup creates a user without session", async () => {
		const { register } = await import("@/features/auth/actions/register")
		mockSignUp.mockResolvedValue({
			data: {
				user: { id: TEST_USER_ID, email: "test@example.com" },
				session: null,
			},
			error: null,
		})

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result).toEqual({
			success: true,
			data: { confirmationRequired: true },
		})
		expect(mockRedirect).not.toHaveBeenCalled()
	})

	it("redirects on successful signup with session", async () => {
		const { register } = await import("@/features/auth/actions/register")

		await expect(register(PREV_STATE, createRegisterFormData())).rejects.toThrow(
			REDIRECT_ERROR_MESSAGE,
		)

		expect(mockCreateUser).toHaveBeenCalledWith({
			id: TEST_USER_ID,
			email: "test@example.com",
		})
		expect(mockRedirect).toHaveBeenCalledWith("/")
	})

	it("sets register rate-limit expiration on first attempt", async () => {
		const { register } = await import("@/features/auth/actions/register")
		mockSignUp.mockResolvedValue({
			data: {
				user: { id: TEST_USER_ID, email: "test@example.com" },
				session: null,
			},
			error: null,
		})

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result).toEqual({
			success: true,
			data: { confirmationRequired: true },
		})
		expect(mockIncr).toHaveBeenCalledTimes(1)
		expect(mockExpire).toHaveBeenCalledWith(expect.stringContaining("register"), 60)
	})

	it("returns register rate-limit error when attempts exceed threshold", async () => {
		const { register } = await import("@/features/auth/actions/register")
		mockIncr.mockResolvedValue(4)

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("rate_limit:auth:register_too_many")
		}
		expect(mockSignUp).not.toHaveBeenCalled()
	})

	it("returns service unavailable when Supabase env vars are missing", async () => {
		const { register } = await import("@/features/auth/actions/register")
		setEnvValue("NEXT_PUBLIC_SUPABASE_URL", undefined)
		setEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined)

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("offline:api:service_unavailable")
		}
	})

	it("returns profile setup failed when createUser throws", async () => {
		const { register } = await import("@/features/auth/actions/register")
		mockCreateUser.mockRejectedValueOnce(new Error("db write failed"))

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.code).toBe("internal_error:database:query_failed")
		}
	})

	it("migrates guest chats and clears guest cookie when token is valid", async () => {
		const { register } = await import("@/features/auth/actions/register")
		cookieStore.get.mockReturnValue({ name: GUEST_COOKIE_NAME, value: "guest-token" })
		mockVerifyGuestToken.mockResolvedValue({ userId: "guest:user" })
		mockTransferGuestChats.mockResolvedValue(2)
		mockSignUp.mockResolvedValue({
			data: {
				user: { id: TEST_USER_ID, email: "test@example.com" },
				session: null,
			},
			error: null,
		})

		const result = await register(PREV_STATE, createRegisterFormData())

		expect(result).toEqual({
			success: true,
			data: { confirmationRequired: true },
		})
		expect(mockVerifyGuestToken).toHaveBeenCalledWith("guest-token")
		expect(mockTransferGuestChats).toHaveBeenCalledWith("guest:user", TEST_USER_ID)
		expect(cookieStore.delete).toHaveBeenCalledWith(GUEST_COOKIE_NAME)
	})

	it("continues successfully when guest migration throws", async () => {
		const { register } = await import("@/features/auth/actions/register")
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

		cookieStore.get.mockReturnValue({ name: GUEST_COOKIE_NAME, value: "guest-token" })
		mockVerifyGuestToken.mockRejectedValueOnce(new Error("migration failed"))
		mockSignUp.mockResolvedValue({
			data: {
				user: { id: TEST_USER_ID, email: "test@example.com" },
				session: null,
			},
			error: null,
		})

		try {
			const result = await register(PREV_STATE, createRegisterFormData())

			expect(result).toEqual({
				success: true,
				data: { confirmationRequired: true },
			})
			expect(cookieStore.delete).toHaveBeenCalledWith(GUEST_COOKIE_NAME)
			expect(consoleErrorSpy).toHaveBeenCalled()
		} finally {
			consoleErrorSpy.mockRestore()
		}
	})
})

describe("createSupabaseActionClient", () => {
	it("returns null when required env vars are not configured", async () => {
		const { createSupabaseActionClient } = await import("@/features/auth/lib/supabase-action")
		setEnvValue("NEXT_PUBLIC_SUPABASE_URL", undefined)
		setEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined)

		const client = await createSupabaseActionClient()

		expect(client).toBeNull()
		expect(mockCreateServerClient).not.toHaveBeenCalled()
	})

	it("creates server client with cookie getAll and setAll bridge", async () => {
		const { createSupabaseActionClient } = await import("@/features/auth/lib/supabase-action")
		mockCreateServerClient.mockReturnValueOnce(mockSupabaseClient)
		cookieStore.getAll.mockReturnValue([{ name: "existing", value: "cookie" }])

		const client = await createSupabaseActionClient()

		expect(client).toBe(mockSupabaseClient)
		expect(mockCreateServerClient).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expect.objectContaining({
				cookies: expect.objectContaining({
					getAll: expect.any(Function),
					setAll: expect.any(Function),
				}),
			}),
		)

		const callArgs = mockCreateServerClient.mock.calls[0]
		if (!callArgs) {
			throw new Error("Expected createServerClient to be called")
		}

		const options = callArgs[2] as {
			cookies: {
				getAll: () => CookieEntry[]
				setAll: (
					cookiesToSet: Array<{
						name: string
						value: string
						options?: CookieOptions
					}>,
				) => void
			}
		}

		expect(options.cookies.getAll()).toEqual([{ name: "existing", value: "cookie" }])

		options.cookies.setAll([
			{ name: "sb-access-token", value: "token", options: { path: "/" } },
		])

		expect(cookieStore.set).toHaveBeenCalledWith("sb-access-token", "token", {
			path: "/",
		})
	})
})
