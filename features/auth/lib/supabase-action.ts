import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { logger } from "@/lib/utils/logger"

/**
 * Create a Supabase server client for Server Action context.
 *
 * Unlike the read-oriented client in `lib/auth/session.ts`, this client
 * does **not** wrap `setAll` in a try/catch — cookie writes must succeed
 * in Server Actions (sign-in / sign-up / sign-out flows set auth tokens).
 *
 * Returns `null` when Supabase environment variables are not configured.
 */
export async function createSupabaseActionClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		logger.warn("Supabase env vars missing", {
			hasUrl: Boolean(supabaseUrl),
			hasAnonKey: Boolean(supabaseAnonKey),
		})
		return null
	}

	const cookieStore = await cookies()

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll()
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					cookieStore.set(name, value, options)
				}
			},
		},
	})
}
