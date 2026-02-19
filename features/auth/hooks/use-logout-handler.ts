/**
 * Logout Handler Hook
 *
 * Provides a logout function that handles cross-tab synchronization
 * and stream abortion for the edge case of logout during streaming.
 *
 * @module features/auth/hooks/use-logout-handler
 */

"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { useAuth } from "../components/auth-provider"

// =============================================================================
// Constants
// =============================================================================

/** BroadcastChannel name for auth state changes (must match auth-provider) */
const AUTH_CHANNEL_NAME = "auth-state-channel"

/** Storage key for auth state changes (must match auth-provider) */
const AUTH_STORAGE_KEY = "auth-state-sync"

/** Types of auth events broadcast across tabs */
type AuthEventType = "login" | "logout" | "session-update"

/** Auth event message structure */
interface AuthEventMessage {
	type: AuthEventType
	timestamp: number
	userId?: string
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to handle logout with cross-tab synchronization.
 *
 * Features:
 * - Calls the logout API endpoint
 * - Broadcasts logout to other tabs via BroadcastChannel
 * - Clears local session state
 * - Redirects to login page
 *
 * @param options - Configuration options
 * @param options.onBeforeLogout - Callback before logout (e.g., abort streams)
 * @param options.redirectTo - Path to redirect after logout (default: "/login")
 *
 * @returns Logout function
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { stop } = useChat();
 *   const handleLogout = useLogoutHandler({
 *     onBeforeLogout: () => stop(),
 *   });
 *
 *   return <button onClick={handleLogout}>Logout</button>;
 * }
 * ```
 */
export function useLogoutHandler(options?: {
	onBeforeLogout?: () => void | Promise<void>
	redirectTo?: string
}): () => Promise<void> {
	const { onBeforeLogout, redirectTo = "/login" } = options ?? {}
	const { setSession } = useAuth()
	const router = useRouter()

	return useCallback(async () => {
		// Call onBeforeLogout callback (e.g., abort active streams)
		await onBeforeLogout?.()

		// Notify same-tab listeners (e.g., active chat stream) before session teardown
		window.dispatchEvent(new Event("auth:logout"))

		// Broadcast logout to other tabs BEFORE clearing session
		// This ensures other tabs receive the event even if this tab navigates away
		const message: AuthEventMessage = {
			type: "logout",
			timestamp: Date.now(),
		}

		// Broadcast via BroadcastChannel
		if (typeof BroadcastChannel !== "undefined") {
			const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
			channel.postMessage(message)
			channel.close()
		}

		// Broadcast via localStorage for fallback
		try {
			localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(message))
		} catch {
			// Ignore storage errors
		}

		// Call logout API
		try {
			await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "include",
			})
		} catch {
			// Continue with local cleanup even if API fails
		}

		// Clear local session state
		setSession(null)

		// Clear localStorage entry
		try {
			localStorage.removeItem(AUTH_STORAGE_KEY)
		} catch {
			// Ignore storage errors
		}

		// Redirect to login page
		router.push(redirectTo)
	}, [onBeforeLogout, redirectTo, setSession, router])
}
