import { SignJWT } from "jose"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS,
	GUEST_TOKEN_TTL_SECONDS,
} from "@/lib/auth/constants"
import { mintGuestToken, rotateGuestToken, verifyGuestToken } from "@/lib/auth/guest"
import { createMockSession, TEST_GUEST_ID, TEST_USER_ID } from "@/tests/fixtures/user"

const mockCreateServerClient = vi.fn()
const mockCookies = vi.fn()
const mockGetUser = vi.fn()

vi.mock("@supabase/ssr", () => ({
	createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

vi.mock("next/headers", () => ({
	cookies: (...args: unknown[]) => mockCookies(...args),
}))

const originalGuestSecret = process.env.GUEST_JWT_SECRET
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalSupabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type CookieStore = {
	getAll: () => Array<{ name: string; value: string }>
	get: (name: string) => { value: string } | undefined
	set: (name: string, value: string, options?: unknown) => void
}

function createCookieStore(guestToken?: string): CookieStore {
	return {
		getAll: () => [],
		get: (name: string) => {
			if (name !== "guest_token" || !guestToken) return undefined
			return { value: guestToken }
		},
		set: () => {
			// no-op in unit tests
		},
	}
}

async function signGuestPayload(payload: Record<string, unknown>) {
	const secret = process.env.GUEST_JWT_SECRET
	if (!secret) {
		throw new Error("GUEST_JWT_SECRET is required for test token signing")
	}

	const nowSeconds = Math.floor(Date.now() / 1000)

	return new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + GUEST_TOKEN_TTL_SECONDS)
		.sign(new TextEncoder().encode(secret))
}

async function loadSessionModule() {
	return import("@/lib/auth/session")
}

beforeEach(() => {
	vi.resetAllMocks()
	vi.resetModules()
	vi.useRealTimers()

	process.env.GUEST_JWT_SECRET = originalGuestSecret
	process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnon

	mockCreateServerClient.mockImplementation(() => ({
		auth: {
			getUser: (...args: unknown[]) => mockGetUser(...args),
		},
	}))

	mockCookies.mockResolvedValue(createCookieStore())
})

afterEach(() => {
	process.env.GUEST_JWT_SECRET = originalGuestSecret
	process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnon
	vi.useRealTimers()
})

describe("lib/auth/session", () => {
	it("returns authenticated session when Supabase user exists", async () => {
		const session = createMockSession({
			user: {
				id: TEST_USER_ID,
				type: "authenticated",
				email: "auth@example.com",
			},
		})
		mockGetUser.mockResolvedValue({
			data: { user: { id: session.user.id, email: session.user.email } },
			error: null,
		})
		mockCookies.mockResolvedValue(createCookieStore())

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({
			user: {
				id: session.user.id,
				type: "authenticated",
				email: session.user.email,
			},
		})
		expect(mockCreateServerClient).toHaveBeenCalledTimes(1)
	})

	it("prefers authenticated session when both auth and guest sessions exist", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: TEST_USER_ID, email: "auth@example.com" } },
			error: null,
		})
		const guestToken = await mintGuestToken(TEST_GUEST_ID)
		mockCookies.mockResolvedValue(createCookieStore(guestToken))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({
			user: {
				id: TEST_USER_ID,
				type: "authenticated",
				email: "auth@example.com",
			},
		})
	})

	it("returns authenticated session with undefined email when Supabase email is missing", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: TEST_USER_ID } },
			error: null,
		})

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({
			user: {
				id: TEST_USER_ID,
				type: "authenticated",
				email: undefined,
			},
		})
	})

	it("falls back to guest session when Supabase has no user", async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
		const guestToken = await mintGuestToken(TEST_GUEST_ID)
		mockCookies.mockResolvedValue(createCookieStore(guestToken))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({ user: { id: TEST_GUEST_ID, type: "guest" } })
	})

	it("falls back to guest session when Supabase returns an auth error", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: TEST_USER_ID, email: "auth@example.com" } },
			error: { message: "token expired" },
		})
		const guestToken = await mintGuestToken(TEST_GUEST_ID)
		mockCookies.mockResolvedValue(createCookieStore(guestToken))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({ user: { id: TEST_GUEST_ID, type: "guest" } })
	})

	it("returns null when neither authenticated nor guest session is available", async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
		mockCookies.mockResolvedValue(createCookieStore())

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toBeNull()
	})

	it("returns null when Supabase lookup throws and guest token is invalid", async () => {
		mockGetUser.mockRejectedValue(new Error("supabase unavailable"))
		mockCookies.mockResolvedValue(createCookieStore("invalid-token"))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toBeNull()
	})

	it("returns null when guest token is expired", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
		const guestToken = await mintGuestToken(TEST_GUEST_ID)

		vi.setSystemTime(new Date("2026-01-01T01:01:00Z"))
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
		mockCookies.mockResolvedValue(createCookieStore(guestToken))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toBeNull()
	})

	it("resolves guest session when Supabase env vars are missing", async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = ""
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
		const guestToken = await mintGuestToken(TEST_GUEST_ID)
		mockCookies.mockResolvedValue(createCookieStore(guestToken))

		const { getAppSession } = await loadSessionModule()
		const result = await getAppSession()

		expect(result).toEqual({ user: { id: TEST_GUEST_ID, type: "guest" } })
		expect(mockCreateServerClient).not.toHaveBeenCalled()
	})

	it("ignores cookie write errors in Supabase setAll helper", async () => {
		const throwingSet = vi.fn(() => {
			throw new Error("read-only cookie store")
		})
		const throwingCookieStore: CookieStore = {
			getAll: () => [],
			get: () => undefined,
			set: throwingSet,
		}
		mockCookies.mockResolvedValue(throwingCookieStore)
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

		const { getAppSession } = await loadSessionModule()
		await expect(getAppSession()).resolves.toBeNull()

		const options = mockCreateServerClient.mock.calls[0]?.[2] as {
			cookies: {
				setAll: (
					cookiesToSet: Array<{ name: string; value: string; options?: unknown }>,
				) => void
			}
		}

		expect(() =>
			options.cookies.setAll([{ name: "sb-access-token", value: "token", options: {} }]),
		).not.toThrow()
		expect(throwingSet).toHaveBeenCalledTimes(1)
	})
})

describe("lib/auth/guest", () => {
	it("mintGuestToken throws when guest secret is missing", async () => {
		process.env.GUEST_JWT_SECRET = ""

		await expect(mintGuestToken(TEST_GUEST_ID)).rejects.toThrow(
			"GUEST_JWT_SECRET is not configured",
		)
	})

	it("mintGuestToken and verifyGuestToken round-trip the user id", async () => {
		const token = await mintGuestToken(TEST_GUEST_ID)
		const result = await verifyGuestToken(token)

		expect(result).toEqual({ userId: TEST_GUEST_ID })
	})

	it("verifyGuestToken returns null for invalid token", async () => {
		const result = await verifyGuestToken("not-a-valid-jwt")

		expect(result).toBeNull()
	})

	it("verifyGuestToken returns null for expired token", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
		const token = await mintGuestToken(TEST_GUEST_ID)

		vi.setSystemTime(new Date("2026-01-01T01:01:00Z"))
		const result = await verifyGuestToken(token)

		expect(result).toBeNull()
	})

	it("verifyGuestToken returns null for token with non-guest type", async () => {
		const token = await signGuestPayload({ sub: TEST_GUEST_ID, type: "authenticated" })

		const result = await verifyGuestToken(token)

		expect(result).toBeNull()
	})

	it("verifyGuestToken returns null when secret is missing", async () => {
		const token = await mintGuestToken(TEST_GUEST_ID)
		process.env.GUEST_JWT_SECRET = ""

		const result = await verifyGuestToken(token)

		expect(result).toBeNull()
	})

	it("rotateGuestToken keeps token when far from expiry", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
		const token = await mintGuestToken(TEST_GUEST_ID)

		vi.setSystemTime(new Date("2026-01-01T00:10:00Z"))
		const rotated = await rotateGuestToken(token)

		expect(rotated).toBe(token)
	})

	it("rotateGuestToken mints a new token when near expiry", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
		const token = await mintGuestToken(TEST_GUEST_ID)

		vi.setSystemTime(new Date("2026-01-01T00:31:00Z"))
		const rotated = await rotateGuestToken(token)

		expect(rotated).not.toBe(token)
		expect(await verifyGuestToken(rotated)).toEqual({ userId: TEST_GUEST_ID })
	})

	it("rotateGuestToken keeps token at the exact rotation threshold", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
		const token = await mintGuestToken(TEST_GUEST_ID)

		vi.setSystemTime(new Date("2026-01-01T00:30:00Z"))
		const rotated = await rotateGuestToken(token)

		expect(rotated).toBe(token)
	})

	it("rotateGuestToken returns original token when secret is missing", async () => {
		const token = await mintGuestToken(TEST_GUEST_ID)
		process.env.GUEST_JWT_SECRET = ""

		const rotated = await rotateGuestToken(token)

		expect(rotated).toBe(token)
	})

	it("rotateGuestToken returns original token for non-guest claim type", async () => {
		const nonGuestToken = await signGuestPayload({ sub: TEST_GUEST_ID, type: "authenticated" })

		const rotated = await rotateGuestToken(nonGuestToken)

		expect(rotated).toBe(nonGuestToken)
	})

	it("rotateGuestToken returns original token on verification failure", async () => {
		const invalidToken = "not-a-token"

		const result = await rotateGuestToken(invalidToken)

		expect(result).toBe(invalidToken)
	})
})

describe("lib/auth/constants", () => {
	it("exports guest cookie name", async () => {
		const constants = await import("@/lib/auth/constants")

		expect(constants.GUEST_COOKIE_NAME).toBe("guest_token")
	})

	it("exports guest token ttl of one hour", () => {
		expect(GUEST_TOKEN_TTL_SECONDS).toBe(60 * 60)
	})

	it("exports rotation threshold shorter than ttl", () => {
		expect(GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS).toBe(30 * 60)
		expect(GUEST_TOKEN_ROTATION_THRESHOLD_SECONDS).toBeLessThan(GUEST_TOKEN_TTL_SECONDS)
	})
})
