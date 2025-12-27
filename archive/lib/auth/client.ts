/**
 * Client-side Auth Utilities
 * Ref: 02-authentication-optimal-design.md §9
 *
 * Browser Supabase client singleton
 *
 * P2-020: Note - Browser env vars are validated at build time
 * and accessed via NEXT_PUBLIC_ prefix (can't use server env module)
 */

import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create browser Supabase client
 * Singleton pattern for client-side
 *
 * Note: NEXT_PUBLIC_ vars are inlined at build time by Next.js.
 * Runtime validation happens server-side via lib/config/env.ts
 */
export function getSupabaseBrowserClient() {
    if (browserClient) {
        return browserClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
        );
    }

    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

    return browserClient;
}
