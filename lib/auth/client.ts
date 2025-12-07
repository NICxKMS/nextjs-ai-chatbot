"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserSupabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
	if (browserSupabaseClient) {
		return browserSupabaseClient;
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error(
			"Supabase client is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
		);
	}

	browserSupabaseClient = createBrowserClient(url, anonKey);
	return browserSupabaseClient;
}
