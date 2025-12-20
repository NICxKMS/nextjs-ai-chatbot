/**
 * Logout API Route
 * Clears authentication cookies
 *
 * POST /api/auth/logout
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { GUEST_TOKEN_COOKIE } from '@/lib/auth/constants';
import { getSupabaseCookieName } from '@/lib/auth/cookies';

/**
 * Server-side logout
 * Clears all auth cookies for a clean slate
 */
export async function POST(_request: Request): Promise<Response> {
  const cookieStore = await cookies();

  // Delete Supabase access token cookie
  const accessTokenCookieName = getSupabaseCookieName();
  cookieStore.delete(accessTokenCookieName);

  // Delete guest token cookie
  cookieStore.delete(GUEST_TOKEN_COOKIE);

  return NextResponse.json(
    {
      success: true,
      message: 'Logged out successfully',
    },
    { status: 200 }
  );
}
