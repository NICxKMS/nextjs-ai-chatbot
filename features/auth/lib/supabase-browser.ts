"use client"

import { createBrowserClient } from "@supabase/ssr"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Get a singleton Supabase browser client for client-side auth operations.
 * Uses `@supabase/ssr` `createBrowserClient` for cookie-based auth.
 *
 * Throws if Supabase environment variables are not configured.
 */
export function getSupabaseBrowserClient() {
	if (browserClient) return browserClient

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!url || !anonKey) {
		throw new Error(
			"Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
		)
	}

	browserClient = createBrowserClient(url, anonKey)
	return browserClient
}
