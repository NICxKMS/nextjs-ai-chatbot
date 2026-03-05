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

	it("falls back to guest session when Supabase has no user", async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
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
