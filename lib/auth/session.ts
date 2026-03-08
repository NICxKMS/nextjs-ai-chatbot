import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { cache } from "react"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import { verifyGuestToken } from "@/lib/auth/guest"

// ── Session types ──────────────────────────────────────────────
// Canonical definitions live in lib/types/session.types.ts.
// Re-exported here for backward compatibility.
export type { AppSession, UserType } from "@/lib/types/session.types"

import type { AppSession } from "@/lib/types/session.types"

// ── Module-level env cache ─────────────────────────────────────

let _supabaseConfig: { url: string; anonKey: string } | null | undefined

function getSupabaseConfig(): { url: string; anonKey: string } | null {
	if (_supabaseConfig !== undefined) return _supabaseConfig

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	_supabaseConfig = url && anonKey ? { url, anonKey } : null
	return _supabaseConfig
}

// ── Supabase server client ─────────────────────────────────────

/**
 * Create a read-oriented Supabase server client using @supabase/ssr.
 * Cookie reads are handled via Next.js `cookies()`.
 * setAll is a no-op in read-only contexts (Server Components).
 */
async function createSupabaseServerClient() {
	const config = getSupabaseConfig()
	if (!config) return null

	const cookieStore = await cookies()

	return createServerClient(config.url, config.anonKey, {
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
 * Resolve guest session from the guest_token cookie.
 *
 * Always verifies the guest JWT from the cookie — never trusts proxy headers
 * for the actual userId. The proxy's `x-session-type: "guest"` hint is consumed
 * by `getAppSession()` to skip the Supabase round-trip (the major perf win),
 * but the guest identity is always verified here via JWT signature check.
 *
 * Cost: ~0.5ms HMAC-SHA256 verification per guest request.
 * Benefit: complete defense-in-depth — even if proxy headers are spoofed or
 * a route bypasses the proxy, the session identity is cryptographically verified.
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
	// Fast path: proxy-provided session type hint skips unnecessary lookups.
	// The proxy classifies the session during request interception:
	//   "none"          — no session cookies present → return null immediately
	//   "guest"         — guest JWT already verified → skip Supabase round-trip
	//   "authenticated" — Supabase cookie found → resolve via Supabase only
	//   (missing)       — non-proxied request → fallback to full resolution
	const headerStore = await headers()
	const sessionType = headerStore.get("x-session-type")

	if (sessionType === "none") {
		return null
	}

	if (sessionType === "guest") {
		return resolveGuestSession()
	}

	// "authenticated" or no hint: try Supabase first, then guest fallback
	const supabaseSession = await resolveSupabaseSession()
	if (supabaseSession) return supabaseSession

	const guestSession = await resolveGuestSession()
	if (guestSession) return guestSession

	return null
})
