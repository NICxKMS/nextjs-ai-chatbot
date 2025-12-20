/**
 * Guest Session API Route
 * Creates or retrieves guest session for anonymous users
 *
 * POST /api/auth/guest
 */

import { NextResponse } from 'next/server';

import { getSessionManager } from '@/lib/auth/session';
import type { AppUser } from '@/lib/auth/types';
import { AppError } from '@/lib/errors';

/**
 * Create or retrieve guest session
 *
 * Returns existing Supabase session if authenticated,
 * existing guest session if present,
 * or creates new guest session.
 */
export async function POST(_request: Request): Promise<Response> {
  const sessionManager = getSessionManager();

  // Check for existing session (Supabase or guest)
  const existingSession = await sessionManager.getSession();

  if (existingSession) {
    // Return existing session
    return NextResponse.json(
      {
        user: existingSession.user,
        isNewSession: false,
      },
      { status: 200 }
    );
  }

  // Create new guest session
  try {
    const guestSession = await sessionManager.createGuestSession();

    const user: AppUser = {
      id: guestSession.user.id,
      type: 'guest',
    };

    // isNewSession: true indicates brand new guest with no history
    // Consumers can skip initial history fetch
    return NextResponse.json(
      {
        user,
        isNewSession: true,
      },
      { status: 200 }
    );
  } catch (error) {
    // Guest session creation failed
    return new AppError({
      code: 'auth:guest_unavailable',
      message: 'Guest authentication is not configured',
    }).toResponse();
  }
}

/**
 * GET handler for server-side guest session with redirect
 * Used when server-side pages need guest session before rendering
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get('redirectUrl') || '/';

  // Validate redirect URL - only allow relative paths
  const safeRedirectUrl = getSafeRedirectUrl(redirectUrl);

  const sessionManager = getSessionManager();

  // Get or create session
  const { session, isNew } = await sessionManager.getOrCreateSession();

  // Redirect with session info in search params if needed
  const redirect = new URL(safeRedirectUrl, url.origin);

  return NextResponse.redirect(redirect, { status: 302 });
}

/**
 * Validate and sanitize redirect URL
 * Only allows safe relative paths
 */
function getSafeRedirectUrl(redirectUrl: string): string {
  try {
    const normalizedUrl = decodeURIComponent(redirectUrl).trim();

    // Block dangerous schemes
    const lowerUrl = normalizedUrl.toLowerCase();
    if (
      lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:') ||
      lowerUrl.startsWith('file:')
    ) {
      return '/';
    }

    // Allow relative paths starting with /
    // Block protocol-relative URLs (//example.com)
    if (normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('//')) {
      // Block path traversal attempts
      if (/^\/[\\]+/.test(normalizedUrl)) {
        return '/';
      }
      return normalizedUrl;
    }

    // For absolute URLs, reject external redirects
    return '/';
  } catch {
    return '/';
  }
}
