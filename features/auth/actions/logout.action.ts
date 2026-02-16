/**
 * Logout Server Action
 *
 * Handles user sign out by clearing the session.
 * Integrates with NextAuth v5 for session management.
 *
 * @module features/auth/actions/logout.action
 */

"use server"

import { signOut } from "@/lib/auth"
import type { AuthResult } from "../types"

// =============================================================================
// Logout Action
// =============================================================================

/**
 * Sign out the current user.
 * Clears the session and optionally redirects.
 *
 * @param redirectTo - Optional path to redirect after logout (defaults to "/")
 * @returns AuthResult indicating success
 *
 * @example
 * ```tsx
 * // In a button component
 * <button onClick={() => logout()}>Sign Out</button>
 *
 * // With redirect
 * <button onClick={() => logout("/login")}>Sign Out</button>
 * ```
 */
export async function logout(redirectTo?: string): Promise<AuthResult> {
	try {
		// Sign out via NextAuth
		await signOut({ redirect: false })

		return {
			success: true,
			redirectTo: redirectTo || "/",
		}
	} catch (error) {
		// Handle any unexpected errors
		console.error("Logout error:", error)
		return {
			success: false,
			error: "Failed to sign out. Please try again.",
		}
	}
}

/**
 * Logout action that redirects after signing out.
 * Use this when you want automatic redirect behavior.
 *
 * @param redirectTo - Path to redirect after logout (defaults to "/")
 */
export async function logoutWithRedirect(redirectTo = "/"): Promise<void> {
	await signOut({ redirect: true, redirectTo })
}
