/**
 * Auth Provider Component
 *
 * Authentication context provider that manages session state,
 * guest session bootstrap, and auth state synchronization.
 *
 * Multi-tab synchronization:
 * - Uses BroadcastChannel API for real-time cross-tab communication
 * - Falls back to storage events for broader compatibility
 * - Handles logout during streaming edge case
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
	useRef,
	useState,
} from "react"
import type { AppSession } from "@/lib/auth/session"
import type { AuthContextValue, AuthStatus } from "../types"

// =============================================================================
// Constants
// =============================================================================

/** BroadcastChannel name for auth state changes */
const AUTH_CHANNEL_NAME = "auth-state-channel"

/** Storage key for auth state changes (fallback) */
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

	// Ref to track previous session for change detection
	const prevSessionRef = useRef<AppSession | null>(initialSession)

	// Ref to store BroadcastChannel
	const channelRef = useRef<BroadcastChannel | null>(null)

	const status: AuthStatus = useMemo(() => {
		if (!session) {
			return "unauthenticated"
		}
		return "authenticated"
	}, [session])

	// =============================================================================
	// BroadcastChannel Setup for Cross-Tab Sync
	// =============================================================================

	useEffect(() => {
		// Check if BroadcastChannel is supported
		if (typeof BroadcastChannel === "undefined") {
			return
		}

		const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
		channelRef.current = channel

		// Listen for auth events from other tabs
		channel.onmessage = (event: MessageEvent<AuthEventMessage>) => {
			const { type } = event.data

			switch (type) {
				case "login": {
					// Another tab logged in - refresh our session
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
					break
				}

				case "logout": {
					// Another tab logged out - clear our session
					// This handles the edge case of logout during streaming
					setSession(null)
					setIsNewSession(false)
					break
				}

				case "session-update": {
					// Session updated in another tab - sync if user ID matches
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
					break
				}
			}
		}

		return () => {
			channel.close()
			channelRef.current = null
		}
	}, [])

	// =============================================================================
	// Storage Event Fallback for Cross-Tab Sync
	// =============================================================================

	useEffect(() => {
		// Handle storage events as fallback for browsers without BroadcastChannel
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key !== AUTH_STORAGE_KEY) {
				return
			}

			if (!event.newValue) {
				return
			}

			try {
				const data = JSON.parse(event.newValue) as AuthEventMessage

				switch (data.type) {
					case "logout": {
						setSession(null)
						setIsNewSession(false)
						break
					}

					case "login":
					case "session-update": {
						fetch("/api/auth/session", {
							method: "GET",
							credentials: "include",
						})
							.then((res) => res.json())
							.then(
								(sessionData: {
									session: AppSession | null
								}) => {
									if (sessionData.session) {
										setSession(sessionData.session)
									}
								},
							)
							.catch(() => {
								// Ignore errors
							})
						break
					}
				}
			} catch {
				// Ignore parse errors
			}
		}

		window.addEventListener("storage", handleStorageChange)

		return () => {
			window.removeEventListener("storage", handleStorageChange)
		}
	}, [])

	// =============================================================================
	// Broadcast Auth Changes to Other Tabs
	// =============================================================================

	// Broadcast logout events when session becomes null
	useEffect(() => {
		// Skip on initial mount
		if (prevSessionRef.current === session) {
			return
		}

		// Detect logout (had session, now null)
		if (prevSessionRef.current && !session) {
			const message: AuthEventMessage = {
				type: "logout",
				timestamp: Date.now(),
			}

			// Broadcast via BroadcastChannel
			channelRef.current?.postMessage(message)

			// Also broadcast via localStorage for fallback
			try {
				localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(message))
				// Remove after a short delay to allow other tabs to process
				setTimeout(() => {
					localStorage.removeItem(AUTH_STORAGE_KEY)
				}, 100)
			} catch {
				// Ignore storage errors
			}
		}

		// Detect login (had no session, now has one)
		if (!prevSessionRef.current && session) {
			const message: AuthEventMessage = {
				type: "login",
				timestamp: Date.now(),
				userId: session.user.id,
			}

			channelRef.current?.postMessage(message)

			try {
				localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(message))
				setTimeout(() => {
					localStorage.removeItem(AUTH_STORAGE_KEY)
				}, 100)
			} catch {
				// Ignore storage errors
			}
		}

		// Update ref for next comparison
		prevSessionRef.current = session
	}, [session])

	// =============================================================================
	// Guest Session Bootstrap
	// =============================================================================

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
				// Swallow errors - guest bootstrap is best-effort.
			}
		})()

		return () => {
			cancelled = true
		}
	}, [session, bootstrapAttempted])

	// =============================================================================
	// Window Focus Sync (Additional Multi-Tab Support)
	// =============================================================================

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

	// =============================================================================
	// Callbacks
	// =============================================================================

	// Clear the new session flag when user creates their first chat
	const clearNewSessionFlag = useCallback(() => {
		setIsNewSession(false)
	}, [])

	// =============================================================================
	// Context Value
	// =============================================================================

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
