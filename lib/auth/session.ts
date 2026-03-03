import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { verifyGuestToken } from "@/lib/auth/guest"

// ── Session types ──────────────────────────────────────────────
// Canonical session shape used across all features.
// P2-T02 (features/auth/types/auth.types.ts) will re-export these types.

/** User classification for session resolution. */
export type UserType = "authenticated" | "guest"

export type AppSession = {
	user: {
		id: string
		type: UserType
		email?: string
	}
}

// ── Supabase server client ─────────────────────────────────────

/**
 * Create a read-oriented Supabase server client using @supabase/ssr.
 * Cookie reads are handled via Next.js `cookies()`.
 * setAll is a no-op in read-only contexts (Server Components).
 */
async function createSupabaseServerClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		return null
	}

	const cookieStore = await cookies()

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll()
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options)
					}
				} catch {
					// setAll may be called from Server Components where
					// cookie mutation is not allowed. Safe to ignore here —
					// session reading does not require cookie writes.
				}
			},
		},
	})
}

// ── Session resolvers ──────────────────────────────────────────

/**
 * Resolve authenticated session from Supabase cookies.
 * Uses supabase.auth.getUser() for server-side verification.
 */
async function resolveSupabaseSession(): Promise<AppSession | null> {
	try {
		const supabase = await createSupabaseServerClient()
		if (!supabase) return null

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser()

		if (error || !user) return null

		return {
			user: {
				id: user.id,
				type: "authenticated",
				email: user.email ?? undefined,
			},
		}
	} catch {
		return null
	}
}

/**
 * Resolve guest session from cookies.
 *
 * Reads the `guest_token` cookie and verifies the JWT via
 * `verifyGuestToken`. Returns a guest AppSession on success,
 * or null for missing/expired/invalid tokens.
 */
async function resolveGuestSession(): Promise<AppSession | null> {
	try {
		const cookieStore = await cookies()
		const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value

		if (!guestToken) return null

		const result = await verifyGuestToken(guestToken)
		if (!result) return null

		return { user: { id: result.userId, type: "guest" } }
	} catch {
		return null
	}
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get the current user's session. Single source of truth for
 * "who is the current user" across server actions, API routes, and layouts.
 *
 * Resolution pipeline:
 * 1. Check Supabase session (authenticated user)
 * 2. Fall back to guest session (JWT in guest_token cookie)
 * 3. Return null if neither token exists or both are invalid
 *
 * Wrapped in `React.cache` for request-scoped memoization —
 * multiple calls within the same server request share one result.
 *
 * **Never throws.** Returns null on any error or invalid token.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
	const supabaseSession = await resolveSupabaseSession()
	if (supabaseSession) return supabaseSession

	const guestSession = await resolveGuestSession()
	if (guestSession) return guestSession

	return null
})
