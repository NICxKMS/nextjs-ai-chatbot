/**
 * Auth Provider Component
 *
 * Authentication context provider that manages session state,
 * guest session bootstrap, and auth state synchronization.
 *
 * @module features/auth/components/auth-provider
 */

"use client"

import type { JSX, ReactNode } from "react"
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"
import type { AppSession } from "@/lib/auth/session"
import type { AuthContextValue, AuthStatus } from "../types"

// =============================================================================
// Context Definition
// =============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// =============================================================================
// Auth Provider Component
// =============================================================================

/**
 * Authentication context provider.
 * Handles session state and guest session bootstrap.
 *
 * @param props - Component props
 * @param props.initialSession - Initial session from server
 * @param props.children - Child components
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * const session = await getSession();
 *
 * <AuthProvider initialSession={session}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
	initialSession,
	children,
}: {
	initialSession: AppSession | null
	children: ReactNode
}): JSX.Element {
	const [session, setSession] = useState<AppSession | null>(initialSession)
	// Track if this is a brand new session (no history to fetch)
	const [isNewSession, setIsNewSession] = useState(false)
	// Track bootstrap attempts to prevent duplicate requests
	const [bootstrapAttempted, setBootstrapAttempted] = useState(
		initialSession !== null,
	)

	const status: AuthStatus = useMemo(() => {
		if (!session) {
			return "unauthenticated"
		}
		return "authenticated"
	}, [session])

	// Bootstrap guest sessions for anonymous users via a dedicated API route.
	// This decouples guest creation from individual data routes (chat, history, etc.)
	// while keeping it non-blocking and low-latency on the client.
	useEffect(() => {
		if (session || bootstrapAttempted) {
			return
		}

		let cancelled = false
		setBootstrapAttempted(true)

		;(async () => {
			try {
				const response = await fetch("/api/auth/guest", {
					method: "POST",
					credentials: "include",
				})

				if (!response.ok || cancelled) {
					return
				}

				const data = (await response.json()) as {
					user?: AppSession["user"] | null
					isNewSession?: boolean
				}

				if (!cancelled && data.user) {
					setSession({ user: data.user })
					// Mark as new session to skip initial history fetch
					if (data.isNewSession) {
						setIsNewSession(true)
					}
				}
			} catch {
				// Swallow errors – guest bootstrap is best-effort.
			}
		})()

		return () => {
			cancelled = true
		}
	}, [session, bootstrapAttempted])

	// Clear the new session flag when user creates their first chat
	const clearNewSessionFlag = useCallback(() => {
		setIsNewSession(false)
	}, [])

	// Sync session state on focus (for multi-tab sync)
	useEffect(() => {
		const handleFocus = () => {
			// Re-fetch session on window focus to sync across tabs
			fetch("/api/auth/session", {
				method: "GET",
				credentials: "include",
			})
				.then((res) => res.json())
				.then((data: { session: AppSession | null }) => {
					if (data.session) {
						setSession(data.session)
					}
				})
				.catch(() => {
					// Ignore errors
				})
		}

		window.addEventListener("focus", handleFocus)
		return () => window.removeEventListener("focus", handleFocus)
	}, [])

	const value = useMemo<AuthContextValue>(
		() => ({
			session,
			status,
			isNewSession,
			setSession,
			clearNewSessionFlag,
		}),
		[session, status, isNewSession, clearNewSessionFlag],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// =============================================================================
// useAuth Hook
// =============================================================================

/**
 * Hook to access auth context.
 *
 * @returns Auth context value
 * @throws If used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { session, status, isNewSession } = useAuth();
 *
 *   if (status === 'loading') return <div>Loading...</div>;
 *   if (status === 'unauthenticated') return <div>Not signed in</div>;
 *
 *   return <div>Welcome, {session?.user.email}</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext)

	if (!ctx) {
		throw new Error("useAuth must be used within an AuthProvider")
	}

	return ctx
}
