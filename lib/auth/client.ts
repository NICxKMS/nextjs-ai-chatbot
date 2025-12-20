'use client';

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get Supabase browser client (singleton)
 * Creates a singleton instance of the Supabase browser client
 * @throws Error if Supabase environment variables are missing
 */
export function getSupabaseBrowserClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
