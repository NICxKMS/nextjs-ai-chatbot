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
	/** True while the current session state is unresolved. */
	isLoading: boolean
	/** True when the current session is a guest session. */
	isGuest: boolean
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

// ── SessionProvider ────────────────────────────────────────────

type SessionSource = AppSession | null | Promise<AppSession | null>

interface SessionProviderProps {
	/**
	 * Initial session resolved server-side via `getAppSession()`, or a promise that
	 * was started in a server layout so the provider can stay mounted during suspense.
	 */
	session: SessionSource
	children: ReactNode
}

const SESSION_REFRESH_EVENTS = new Set<AuthChangeEvent>([
	"SIGNED_IN",
	"SIGNED_OUT",
	"TOKEN_REFRESHED",
])

function isPromiseLike(session: SessionSource): session is Promise<AppSession | null> {
	return (
		typeof session === "object" &&
		session !== null &&
		"then" in session &&
		typeof session.then === "function"
	)
}

/**
 * Provides auth session state to all client components via React context.
 *
 * - Receives an initial session value or server-started promise from a shared layout
 * - Subscribes to Supabase `onAuthStateChange` for cross-tab login,
 *   logout, and token refresh events
 * - Calls `router.refresh()` on auth state changes to revalidate
 *   server components
 * - Derives `isGuest` from `session.user.type`
 *
 * **No client-side JWT minting.** Guest sessions are resolved entirely
 * server-side via proxy.ts cookie forwarding.
 */
export function SessionProvider({ session: sessionSource, children }: SessionProviderProps) {
	const router = useRouter()
	const [session, setSession] = useState<AppSession | null>(() =>
		isPromiseLike(sessionSource) ? null : sessionSource,
	)
	const [isLoading, setIsLoading] = useState(() => isPromiseLike(sessionSource))

	// Sync state when the server re-renders with a new session value or promise
	// (for example after router.refresh() or a route transition).
	useEffect(() => {
		let isActive = true

		if (isPromiseLike(sessionSource)) {
			setIsLoading(true)

			void sessionSource.then(
				(resolvedSession) => {
					if (!isActive) return
					setSession(resolvedSession)
					setIsLoading(false)
				},
				() => {
					if (!isActive) return
					setSession(null)
					setIsLoading(false)
				},
			)

			return () => {
				isActive = false
			}
		}

		setSession(sessionSource)
		setIsLoading(false)

		return () => {
			isActive = false
		}
	}, [sessionSource])

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
			return
		}

		return () => {
			unsubscribe?.()
		}
	}, [router])

	const isGuest = session?.user.type === "guest" || isLoading

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
				"Wrap your component tree with <SessionProvider> in a shared route layout.",
		)
	}

	return context
}
