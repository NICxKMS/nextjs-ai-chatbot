// Flow: auth-session | Step: session-resolution
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockCookies, createMockHeaders } from "@/__tests__/mocks/next-headers"

// ── Mocks (hoisted before imports) ─────────────────────────────

vi.mock("react", async () => {
	const actual = await vi.importActual("react")
	// Bypass React.cache memoization — each call executes the function directly
	return { ...(actual as object), cache: (fn: unknown) => fn }
})

vi.mock("next/headers", () => ({
	cookies: vi.fn(),
	headers: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
	createServerClient: vi.fn(),
}))

vi.mock("@/lib/auth/guest", () => ({
	verifyGuestToken: vi.fn(),
}))

// ── Imports (after mocks are declared) ─────────────────────────

import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

import { verifyGuestToken } from "@/lib/auth/guest"
import { type AppSession, getAppSession } from "@/lib/auth/session"

// ── Helpers ────────────────────────────────────────────────────

/** Create a mock Supabase client with configurable getUser result. */
function createMockSupabaseClient(getUserResult: {
	data: { user: { id: string; email?: string | null } | null }
	error: Error | null
}) {
	return { auth: { getUser: vi.fn().mockResolvedValue(getUserResult) } }
}

// ── Tests ──────────────────────────────────────────────────────

describe("getAppSession", () => {
	let mockCookieStore: ReturnType<typeof createMockCookies>
	let mockHeaderStore: ReturnType<typeof createMockHeaders>

	beforeEach(() => {
		mockCookieStore = createMockCookies()
		mockHeaderStore = createMockHeaders()

		// next/headers mocks return our controlled stores.
		// Type assertions: mock stores are test doubles with partial interface coverage.
		vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)
		vi.mocked(headers).mockResolvedValue(mockHeaderStore as any)

		// Default: Supabase returns no authenticated user
		const defaultClient = createMockSupabaseClient({
			data: { user: null },
			error: new Error("No session"),
		})
		vi.mocked(createServerClient).mockReturnValue(defaultClient as any)

		// Default: guest token verification returns null
		vi.mocked(verifyGuestToken).mockResolvedValue(null)
	})

	it("returns authenticated session when Supabase user exists", async () => {
		const supabaseClient = createMockSupabaseClient({
			data: { user: { id: "auth-user-id", email: "user@example.com" } },
			error: null,
		})
		vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)

		const session = await getAppSession()

		expect(session).toEqual<AppSession>({
			user: { id: "auth-user-id", type: "authenticated", email: "user@example.com" },
		})
	})

	it("sets email to undefined when Supabase user has null email", async () => {
		const supabaseClient = createMockSupabaseClient({
			data: { user: { id: "auth-user-id", email: null } },
			error: null,
		})
		vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)

		const session = await getAppSession()

		expect(session).not.toBeNull()
		expect(session?.user.email).toBeUndefined()
		expect(session?.user.type).toBe("authenticated")
	})

	it("prioritizes authenticated session over guest session", async () => {
		// Both Supabase and guest header present
		const supabaseClient = createMockSupabaseClient({
			data: { user: { id: "auth-user-id", email: "user@example.com" } },
			error: null,
		})
		vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)
		mockHeaderStore._store.set("x-guest-user-id", "guest-user-id")

		const session = await getAppSession()

		expect(session?.user.type).toBe("authenticated")
		expect(session?.user.id).toBe("auth-user-id")
	})

	it("ignores x-guest-user-id header and resolves guest from cookie JWT", async () => {
		// Security: x-guest-user-id header alone must NOT grant a session
		mockHeaderStore._store.set("x-guest-user-id", "spoofed-id")

		const session = await getAppSession()

		// No cookie → no guest session, even with header present
		expect(session).toBeNull()
		expect(verifyGuestToken).not.toHaveBeenCalled()
	})

	it("returns guest session via cookie when verifyGuestToken succeeds", async () => {
		// No x-guest-user-id header (default)
		// Guest token cookie present
		mockCookieStore._store.set("guest_token", { value: "valid.jwt.token" })

		vi.mocked(verifyGuestToken).mockResolvedValue({
			userId: "cookie-guest-id",
			exp: Math.floor(Date.now() / 1000) + 3600,
		})

		const session = await getAppSession()

		expect(session).toEqual<AppSession>({
			user: { id: "cookie-guest-id", type: "guest" },
		})
		expect(verifyGuestToken).toHaveBeenCalledWith("valid.jwt.token")
	})

	it("returns null when no session exists (no Supabase, no guest)", async () => {
		// Defaults: no Supabase user, no guest header, no guest cookie
		const session = await getAppSession()

		expect(session).toBeNull()
	})

	it("returns null and falls through when Supabase client throws", async () => {
		vi.mocked(createServerClient).mockImplementation(() => {
			throw new Error("Supabase connection failed")
		})

		// No guest session either
		const session = await getAppSession()

		expect(session).toBeNull()
	})

	it("returns null when guest token verification fails", async () => {
		// Guest token cookie present but verification fails
		mockCookieStore._store.set("guest_token", { value: "invalid-token" })
		vi.mocked(verifyGuestToken).mockResolvedValue(null)

		const session = await getAppSession()

		expect(session).toBeNull()
	})

	// ── x-session-type optimization tests ──────────────────────

	describe("x-session-type proxy hint", () => {
		it('skips all resolution and returns null when x-session-type is "none"', async () => {
			mockHeaderStore._store.set("x-session-type", "none")

			const session = await getAppSession()

			expect(session).toBeNull()
			// Supabase client should never be created — no round-trip wasted
			expect(createServerClient).not.toHaveBeenCalled()
			expect(verifyGuestToken).not.toHaveBeenCalled()
		})

		it('skips Supabase and resolves guest from cookie when x-session-type is "guest"', async () => {
			mockHeaderStore._store.set("x-session-type", "guest")
			// Guest identity comes from cookie JWT, not header
			mockCookieStore._store.set("guest_token", { value: "valid.jwt.token" })
			vi.mocked(verifyGuestToken).mockResolvedValue({
				userId: "proxy-verified-guest",
				exp: Math.floor(Date.now() / 1000) + 3600,
			})

			const session = await getAppSession()

			expect(session).toEqual<AppSession>({
				user: { id: "proxy-verified-guest", type: "guest" },
			})
			// Supabase client should never be created — guest path is authoritative
			expect(createServerClient).not.toHaveBeenCalled()
			// Guest identity verified from cookie JWT
			expect(verifyGuestToken).toHaveBeenCalledWith("valid.jwt.token")
		})

		it('resolves Supabase session when x-session-type is "authenticated"', async () => {
			mockHeaderStore._store.set("x-session-type", "authenticated")
			const supabaseClient = createMockSupabaseClient({
				data: { user: { id: "auth-user-id", email: "user@example.com" } },
				error: null,
			})
			vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)

			const session = await getAppSession()

			expect(session).toEqual<AppSession>({
				user: { id: "auth-user-id", type: "authenticated", email: "user@example.com" },
			})
		})

		it("falls back to full resolution when x-session-type header is missing", async () => {
			// No x-session-type header — simulates non-proxied request (e.g., /api/history)
			const supabaseClient = createMockSupabaseClient({
				data: { user: { id: "auth-user-id", email: "test@example.com" } },
				error: null,
			})
			vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)

			const session = await getAppSession()

			expect(session?.user.type).toBe("authenticated")
			expect(createServerClient).toHaveBeenCalled()
		})

		it('falls back to guest cookie when x-session-type is "authenticated" but Supabase fails', async () => {
			mockHeaderStore._store.set("x-session-type", "authenticated")
			// Supabase cookie exists but session is expired/invalid
			const supabaseClient = createMockSupabaseClient({
				data: { user: null },
				error: new Error("Session expired"),
			})
			vi.mocked(createServerClient).mockReturnValue(supabaseClient as any)

			// Guest fallback available via cookie JWT
			mockCookieStore._store.set("guest_token", { value: "fallback.jwt.token" })
			vi.mocked(verifyGuestToken).mockResolvedValue({
				userId: "fallback-guest",
				exp: Math.floor(Date.now() / 1000) + 3600,
			})

			const session = await getAppSession()

			expect(session).toEqual<AppSession>({
				user: { id: "fallback-guest", type: "guest" },
			})
			expect(verifyGuestToken).toHaveBeenCalledWith("fallback.jwt.token")
		})
	})
})
