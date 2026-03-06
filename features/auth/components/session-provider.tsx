"use client"

import type { AuthChangeEvent } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react"
import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase-browser"
import type { AppSession } from "@/lib/auth/session"

// ── Context types ──────────────────────────────────────────────

interface SessionContextValue {
	/** Current session (authenticated or guest). Null if unauthenticated. */
	session: AppSession | null
	/** True during initial mount before the auth listener has settled. */
	isLoading: boolean
	/** True when the current session is a guest session. */
	isGuest: boolean
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

// ── SessionProvider ────────────────────────────────────────────

interface SessionProviderProps {
	/** Initial session resolved server-side via `getAppSession()`. */
	session: AppSession | null
	children: ReactNode
}

const SESSION_REFRESH_EVENTS = new Set<AuthChangeEvent>([
	"SIGNED_IN",
	"SIGNED_OUT",
	"TOKEN_REFRESHED",
])

/**
 * Provides auth session state to all client components via React context.
 *
 * - Receives initial session from server component (layout.tsx)
 * - Subscribes to Supabase `onAuthStateChange` for cross-tab login,
 *   logout, and token refresh events
 * - Calls `router.refresh()` on auth state changes to revalidate
 *   server components
 * - Derives `isGuest` from `session.user.type`
 *
 * **No client-side JWT minting.** Guest sessions are resolved entirely
 * server-side via proxy.ts cookie forwarding.
 */
export function SessionProvider({ session: initialSession, children }: SessionProviderProps) {
	const router = useRouter()
	const [session, setSession] = useState<AppSession | null>(initialSession)
	const [isLoading, setIsLoading] = useState(true)

	// Sync state when server re-renders with a new session prop
	// (e.g., after router.refresh() revalidates the layout)
	useEffect(() => {
		setSession(initialSession)
	}, [initialSession])

	// Subscribe to Supabase auth state changes
	useEffect(() => {
		let unsubscribe: (() => void) | undefined

		try {
			const supabase = getSupabaseBrowserClient()

			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
				if (SESSION_REFRESH_EVENTS.has(event)) {
					// Revalidate all server components — the server will re-run
					// getAppSession() and pass an updated session prop
					router.refresh()
				}
			})

			unsubscribe = () => {
				subscription.unsubscribe()
			}
		} catch {
			setIsLoading(false)
			return
		}

		// Auth listener is set up — no longer in initial loading state
		setIsLoading(false)

		return () => {
			unsubscribe?.()
		}
	}, [router])

	const isGuest = session?.user.type === "guest"

	const value = useMemo<SessionContextValue>(
		() => ({ session, isLoading, isGuest }),
		[session, isLoading, isGuest],
	)

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// ── useSession hook ────────────────────────────────────────────

/**
 * Access the current auth session from any client component.
 *
 * @throws Error if called outside a `<SessionProvider>`.
 */
export function useSession(): SessionContextValue {
	const context = useContext(SessionContext)

	if (context === undefined) {
		throw new Error(
			"useSession must be used within a <SessionProvider>. " +
				"Wrap your component tree with <SessionProvider> in your root layout.",
		)
	}

	return context
}
