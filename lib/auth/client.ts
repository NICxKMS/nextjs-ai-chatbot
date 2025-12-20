/**
 * Client-side Auth Utilities
 * Ref: 02-authentication-optimal-design.md §9
 *
 * Browser Supabase client singleton
 */

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create browser Supabase client
 * Singleton pattern for client-side
 */
export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}
