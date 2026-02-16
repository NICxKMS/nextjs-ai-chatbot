/**
 * useAuthState Hook
 *
 * Extended auth state hook with additional utilities beyond basic useAuth.
 *
 * @module features/auth/hooks/use-auth
 */

"use client"

import { useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import { useAuth } from "../components/auth-provider"
import type { AuthUser } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useAuthState hook
 */
export interface UseAuthStateReturn {
	/** Whether user is authenticated */
	isAuthenticated: boolean
	/** Whether user is a guest */
	isGuest: boolean
	/** Whether auth is loading */
	isLoading: boolean
	/** Current user info */
	user: AuthUser | null
	/** Sign out handler */
	signOut: () => Promise<void>
	/** Whether this is a new session */
	isNewSession: boolean
}

// =============================================================================
// useAuthState Hook
// =============================================================================

/**
 * Extended auth state with utilities.
 *
 * @returns Auth state and actions
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { isAuthenticated, isGuest, user, signOut } = useAuthState();
 *
 *   if (!isAuthenticated) {
 *     return <SignInPrompt />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.email}</p>
 *       {isGuest && <p>You're using a guest account</p>}
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuthState(): UseAuthStateReturn {
	const { session, status, isNewSession } = useAuth()
	const router = useRouter()

	// Derive authentication state
	const isAuthenticated = useMemo(() => {
		return status === "authenticated" && session !== null
	}, [status, session])

	// Derive guest status
	const isGuest = useMemo(() => {
		return session?.user.type === "guest"
	}, [session])

	// Derive loading state
	const isLoading = useMemo(() => {
		return status === "loading"
	}, [status])

	// Extract user info
	const user = useMemo<AuthUser | null>(() => {
		if (!session?.user) return null
		return {
			id: session.user.id,
			email: session.user.email ?? null,
			type: session.user.type,
		}
	}, [session])

	// Sign out handler
	const signOut = useCallback(async () => {
		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "include",
			})

			if (response.ok) {
				router.push("/")
				router.refresh()
			}
		} catch (error) {
			console.error("Sign out error:", error)
		}
	}, [router])

	return {
		isAuthenticated,
		isGuest,
		isLoading,
		user,
		signOut,
		isNewSession,
	}
}
