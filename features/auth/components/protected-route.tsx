/**
 * Protected Route Component
 *
 * Route wrapper that enforces authentication.
 * Redirects unauthenticated users to login page.
 *
 * @module features/auth/components/protected-route
 */

"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect } from "react"
import type { ProtectedRouteProps } from "../types"
import { useAuth } from "./auth-provider"

// =============================================================================
// Protected Route Component
// =============================================================================

/**
 * Route wrapper that requires authentication.
 *
 * @param props - Component props
 * @param props.children - Content to render when authenticated
 * @param props.redirectTo - Redirect path for unauthenticated users
 * @param props.allowGuest - Allow guest users (default: true)
 * @param props.fallback - Loading component
 *
 * @example
 * ```tsx
 * // Require authentication (guests allowed)
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // Require full authentication (no guests)
 * <ProtectedRoute allowGuest={false}>
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // Custom redirect and loading state
 * <ProtectedRoute
 *   redirectTo="/signin"
 *   fallback={<LoadingSpinner />}
 * >
 *   <Profile />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
	children,
	redirectTo = "/login",
	allowGuest = true,
	fallback,
}: ProtectedRouteProps): ReactNode {
	const { session, status } = useAuth()
	const router = useRouter()

	useEffect(() => {
		// Wait for session to load
		if (status === "loading") {
			return
		}

		// No session - redirect to login
		if (!session) {
			router.push(redirectTo)
			return
		}

		// Guest user but guests not allowed - redirect
		if (!allowGuest && session.user.type === "guest") {
			router.push(redirectTo)
			return
		}
	}, [session, status, router, redirectTo, allowGuest])

	// Show loading state
	if (status === "loading") {
		return fallback ?? null
	}

	// No session - show nothing while redirecting
	if (!session) {
		return fallback ?? null
	}

	// Guest user but guests not allowed - show nothing while redirecting
	if (!allowGuest && session.user.type === "guest") {
		return fallback ?? null
	}

	// Authenticated - render children
	return <>{children}</>
}
