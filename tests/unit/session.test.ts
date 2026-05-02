import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	cookies: vi.fn(),
	headers: vi.fn(),
	createServerClient: vi.fn(),
	verifyGuestToken: vi.fn(),
}))

vi.mock("react", () => ({
	cache: <Args extends unknown[], Return>(fn: (...args: Args) => Return) => fn,
}))
vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }))
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }))
vi.mock("@/lib/auth/guest", () => ({ verifyGuestToken: mocks.verifyGuestToken }))

function createCookieStore(cookiesByName: Record<string, string> = {}) {
	return {
		get: vi.fn((name: string) => {
			const value = cookiesByName[name]
			return value === undefined ? undefined : { name, value }
		}),
		getAll: vi.fn(() =>
			Object.entries(cookiesByName).map(([name, value]) => ({ name, value })),
		),
		set: vi.fn(),
	}
}

async function importSessionModule() {
	vi.resetModules()
	return import("@/lib/auth/session")
}

describe("getAppSession", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		delete process.env.NEXT_PUBLIC_SUPABASE_URL
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		mocks.headers.mockResolvedValue({ get: vi.fn(() => null) })
		mocks.cookies.mockResolvedValue(createCookieStore())
		mocks.verifyGuestToken.mockResolvedValue(null)
	})

	it("returns null immediately when proxy marks the request sessionless", async () => {
		mocks.headers.mockResolvedValue({ get: vi.fn(() => "none") })
		const { getAppSession } = await importSessionModule()

		await expect(getAppSession()).resolves.toBeNull()
		expect(mocks.createServerClient).not.toHaveBeenCalled()
		expect(mocks.cookies).not.toHaveBeenCalled()
	})

	it("resolves a guest session from the signed guest cookie without Supabase", async () => {
		mocks.headers.mockResolvedValue({ get: vi.fn(() => "guest") })
		mocks.cookies.mockResolvedValue(createCookieStore({ guest_token: "guest.jwt" }))
		mocks.verifyGuestToken.mockResolvedValue({ userId: "guest-1" })
		const { getAppSession } = await importSessionModule()

		await expect(getAppSession()).resolves.toEqual({ user: { id: "guest-1", type: "guest" } })
		expect(mocks.createServerClient).not.toHaveBeenCalled()
		expect(mocks.verifyGuestToken).toHaveBeenCalledWith("guest.jwt")
	})

	it("prefers a verified Supabase user over guest fallback", async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com"
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
		mocks.cookies.mockResolvedValue(createCookieStore({ guest_token: "guest.jwt" }))
		mocks.createServerClient.mockReturnValue({
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: { user: { id: "user-1", email: "user@example.com" } },
					error: null,
				}),
			},
		})
		const { getAppSession } = await importSessionModule()

		await expect(getAppSession()).resolves.toEqual({
			user: { id: "user-1", type: "authenticated", email: "user@example.com" },
		})
		expect(mocks.verifyGuestToken).not.toHaveBeenCalled()
	})

	it("falls back to guest resolution when Supabase is unavailable", async () => {
		mocks.cookies.mockResolvedValue(createCookieStore({ guest_token: "guest.jwt" }))
		mocks.verifyGuestToken.mockResolvedValue({ userId: "guest-2" })
		const { getAppSession } = await importSessionModule()

		await expect(getAppSession()).resolves.toEqual({ user: { id: "guest-2", type: "guest" } })
	})
})
