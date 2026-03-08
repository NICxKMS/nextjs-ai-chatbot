// Flow: auth-logout | Step: logout-action

import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks ────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
	cookies: vi.fn(),
}))

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}))

vi.mock("@/features/auth/lib/supabase-action", () => ({
	createSupabaseActionClient: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createMockCookies } from "@/__tests__/mocks/next-headers"
import { logout } from "@/features/auth/actions/logout"
import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"

const mockCookies = cookies as ReturnType<typeof vi.fn>
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>
const mockCreateSupabaseActionClient = createSupabaseActionClient as ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()
})

describe("logout", () => {
	it("signs out from Supabase and redirects to /login", async () => {
		const signOut = vi.fn().mockResolvedValue({ error: null })
		mockCreateSupabaseActionClient.mockResolvedValue({ auth: { signOut } })
		const mockCookieStore = createMockCookies()
		mockCookies.mockResolvedValue(mockCookieStore)

		await logout()

		expect(signOut).toHaveBeenCalledOnce()
		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
		expect(mockRedirect).toHaveBeenCalledWith("/login")
	})

	it("still clears guest cookie and redirects when Supabase client is null", async () => {
		mockCreateSupabaseActionClient.mockResolvedValue(null)
		const mockCookieStore = createMockCookies()
		mockCookies.mockResolvedValue(mockCookieStore)

		await logout()

		expect(mockCookieStore.delete).toHaveBeenCalledWith("guest_token")
		expect(mockRedirect).toHaveBeenCalledWith("/login")
	})

	it("clears guest cookie after Supabase signOut (order matters)", async () => {
		const callOrder: string[] = []
		const signOut = vi.fn().mockImplementation(async () => {
			callOrder.push("signOut")
			return { error: null }
		})
		mockCreateSupabaseActionClient.mockResolvedValue({ auth: { signOut } })

		const mockCookieStore = createMockCookies()
		mockCookieStore.delete.mockImplementation(() => {
			callOrder.push("deleteCookie")
		})
		mockCookies.mockResolvedValue(mockCookieStore)

		await logout()

		expect(callOrder).toEqual(["signOut", "deleteCookie"])
	})
})
