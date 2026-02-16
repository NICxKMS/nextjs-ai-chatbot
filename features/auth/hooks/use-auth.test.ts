/**
 * Tests for useAuthState Hook
 *
 * Unit tests for the extended auth state hook.
 *
 * @module features/auth/hooks/use-auth.test
 */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppSession } from "@/lib/auth/session"
import { useAuthState } from "./use-auth"

// =============================================================================
// Mocks
// =============================================================================

// Mock the useAuth hook from auth-provider
const mockPush = vi.fn()
const mockRefresh = vi.fn()

let mockSession: AppSession | null = null
let mockStatus: "loading" | "authenticated" | "unauthenticated" = "loading"
let mockIsNewSession = false

vi.mock("../components/auth-provider", () => ({
	useAuth: vi.fn(() => ({
		session: mockSession,
		status: mockStatus,
		isNewSession: mockIsNewSession,
		setSession: vi.fn(),
		clearNewSessionFlag: vi.fn(),
	})),
}))

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: mockPush,
		refresh: mockRefresh,
	})),
}))

// =============================================================================
// Test Fixtures
// =============================================================================

const createRegularSession = (): AppSession => ({
	user: {
		id: "user-123",
		type: "regular",
		email: "test@example.com",
		name: "Test User",
		image: null,
	},
	expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

const createGuestSession = (): AppSession => ({
	user: {
		id: "guest:abc-123",
		type: "guest",
		email: null,
	},
})

// =============================================================================
// Tests
// =============================================================================

describe("useAuthState", () => {
	beforeEach(() => {
		// Reset mock state
		mockSession = null
		mockStatus = "loading"
		mockIsNewSession = false
		vi.clearAllMocks()
	})

	// ---------------------------------------------------------------------------
	// Authentication Status Tests
	// ---------------------------------------------------------------------------

	describe("authentication status", () => {
		it("should report not authenticated when session is null", () => {
			mockSession = null
			mockStatus = "unauthenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isAuthenticated).toBe(false)
		})

		it("should report authenticated when session exists", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isAuthenticated).toBe(true)
		})

		it("should report loading during initial load", () => {
			mockSession = null
			mockStatus = "loading"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isLoading).toBe(true)
			expect(result.current.isAuthenticated).toBe(false)
		})

		it("should not report loading when authenticated", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isLoading).toBe(false)
		})
	})

	// ---------------------------------------------------------------------------
	// Guest Status Tests
	// ---------------------------------------------------------------------------

	describe("guest status", () => {
		it("should identify guest user", () => {
			mockSession = createGuestSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isGuest).toBe(true)
			expect(result.current.isAuthenticated).toBe(true)
		})

		it("should identify regular user as non-guest", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isGuest).toBe(false)
			expect(result.current.isAuthenticated).toBe(true)
		})

		it("should not be guest when no session", () => {
			mockSession = null
			mockStatus = "unauthenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isGuest).toBe(false)
		})
	})

	// ---------------------------------------------------------------------------
	// User Info Tests
	// ---------------------------------------------------------------------------

	describe("user info", () => {
		it("should extract user info from session", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.user).toEqual({
				id: "user-123",
				email: "test@example.com",
				type: "regular",
			})
		})

		it("should return null user when no session", () => {
			mockSession = null
			mockStatus = "unauthenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.user).toBeNull()
		})

		it("should handle guest user info", () => {
			mockSession = createGuestSession()
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.user).toEqual({
				id: "guest:abc-123",
				email: null,
				type: "guest",
			})
		})

		it("should handle user without email", () => {
			mockSession = {
				user: {
					id: "user-456",
					type: "regular",
					email: null,
					name: null,
					image: null,
				},
			}
			mockStatus = "authenticated"

			const { result } = renderHook(() => useAuthState())

			expect(result.current.user?.email).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Sign Out Tests
	// ---------------------------------------------------------------------------

	describe("signOut", () => {
		it("should call logout API on sign out", async () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			// Mock successful fetch
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
			})
			vi.stubGlobal("fetch", mockFetch)

			const { result } = renderHook(() => useAuthState())

			await act(async () => {
				await result.current.signOut()
			})

			expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
				method: "POST",
				credentials: "include",
			})
		})

		it("should redirect to home after successful sign out", async () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
			})
			vi.stubGlobal("fetch", mockFetch)

			const { result } = renderHook(() => useAuthState())

			await act(async () => {
				await result.current.signOut()
			})

			expect(mockPush).toHaveBeenCalledWith("/")
			expect(mockRefresh).toHaveBeenCalled()
		})

		it("should handle sign out error gracefully", async () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const mockFetch = vi
				.fn()
				.mockRejectedValue(new Error("Network error"))
			vi.stubGlobal("fetch", mockFetch)

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {})

			const { result } = renderHook(() => useAuthState())

			// Should not throw
			await act(async () => {
				await result.current.signOut()
			})

			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it("should not redirect on failed logout response", async () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
			})
			vi.stubGlobal("fetch", mockFetch)

			const { result } = renderHook(() => useAuthState())

			await act(async () => {
				await result.current.signOut()
			})

			expect(mockPush).not.toHaveBeenCalled()
		})
	})

	// ---------------------------------------------------------------------------
	// New Session Tests
	// ---------------------------------------------------------------------------

	describe("new session flag", () => {
		it("should pass through isNewSession flag", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"
			mockIsNewSession = true

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isNewSession).toBe(true)
		})

		it("should be false when not a new session", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"
			mockIsNewSession = false

			const { result } = renderHook(() => useAuthState())

			expect(result.current.isNewSession).toBe(false)
		})
	})

	// ---------------------------------------------------------------------------
	// Re-render Optimization Tests
	// ---------------------------------------------------------------------------

	describe("memoization", () => {
		it("should return stable isAuthenticated reference", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result, rerender } = renderHook(() => useAuthState())

			const firstIsAuthenticated = result.current.isAuthenticated

			rerender()

			// Should be the same reference since state hasn't changed
			expect(result.current.isAuthenticated).toBe(firstIsAuthenticated)
		})

		it("should return stable user reference for same session", () => {
			mockSession = createRegularSession()
			mockStatus = "authenticated"

			const { result, rerender } = renderHook(() => useAuthState())

			const firstUser = result.current.user

			rerender()

			// User object should be stable for same session
			expect(result.current.user).toBe(firstUser)
		})
	})
})
