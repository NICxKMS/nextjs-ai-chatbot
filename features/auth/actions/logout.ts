"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createSupabaseActionClient } from "@/features/auth/lib/supabase-action"
import { GUEST_COOKIE_NAME } from "@/lib/auth/constants"
import type { ActionResult } from "@/lib/types/result.types"

// ── Server Action ──────────────────────────────────────────────

/**
 * Sign out and clear all session state.
 *
 * Clears Supabase auth cookies via `signOut()` and removes the
 * guest token cookie. Does NOT re-mint a guest token — guest
 * re-bootstrap is deferred to `proxy.ts` on the next request.
 *
 * Always redirects to "/login" (never returns on success).
 */
export async function logout(): Promise<ActionResult<void>> {
	// 1. Sign out from Supabase (best effort — clears auth cookies via setAll)
	const supabase = await createSupabaseActionClient()
	if (supabase) {
		await supabase.auth.signOut()
	}

	// 2. Clear guest token
	const cookieStore = await cookies()
	cookieStore.delete(GUEST_COOKIE_NAME)

	// 3. Redirect to login (throws NEXT_REDIRECT — must be outside try/catch)
	redirect("/login")
}
