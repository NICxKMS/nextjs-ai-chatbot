/**
 * Session Manager
 * Ref: 02-authentication-optimal-design.md §7
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import type {
  AppSession,
  AppUser,
  DataContext,
  GuestTokenPayload,
} from './types';
import { verifyGuestToken, createGuestToken, needsRotation } from './jwt';
import { getGuestTokenCookie, setGuestTokenCookie } from './cookies';

/**
 * SessionManager - Handles all session operations
 * Priority: Supabase session > Guest session
 */
export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get current session from cookies
   * Returns null if no valid session exists
   */
  async getSession(): Promise<AppSession | null> {
    // Try Supabase session first
    const supabaseSession = await this.getSupabaseSession();
    if (supabaseSession) {
      return supabaseSession;
    }

    // Fall back to guest session
    return this.getGuestSession();
  }

  /**
   * Get Supabase session from cookie
   */
  private async getSupabaseSession(): Promise<AppSession | null> {
    try {
      const cookieStore = await cookies();

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {
              // Read-only in this context
            },
          },
        }
      );

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      const appUser: AppUser = {
        id: user.id,
        type: 'regular',
        email: user.email,
      };

      return { user: appUser };
    } catch {
      return null;
    }
  }

  /**
   * Get guest session from cookie
   */
  private async getGuestSession(): Promise<AppSession | null> {
    const token = await getGuestTokenCookie();
    if (!token) {
      return null;
    }

    const payload = await verifyGuestToken(token);
    if (!payload) {
      return null;
    }

    // Extract guest ID from 'guest:{uuid}' format
    const guestId = payload.sub.replace('guest:', '');

    const appUser: AppUser = {
      id: guestId,
      type: 'guest',
    };

    return { user: appUser };
  }

  /**
   * Create a new guest session
   */
  async createGuestSession(): Promise<AppSession> {
    const guestId = nanoid();
    const token = await createGuestToken(guestId);

    await setGuestTokenCookie(token);

    const appUser: AppUser = {
      id: guestId,
      type: 'guest',
    };

    return { user: appUser };
  }

  /**
   * Get or create session (for initial page load)
   * Returns { session, isNew } to optimize client bootstrap
   */
  async getOrCreateSession(): Promise<{ session: AppSession; isNew: boolean }> {
    const existing = await this.getSession();

    if (existing) {
      return { session: existing, isNew: false };
    }

    const session = await this.createGuestSession();
    return { session, isNew: true };
  }

  /**
   * Rotate guest token if needed
   * Called from middleware for proactive rotation
   */
  async rotateGuestTokenIfNeeded(): Promise<boolean> {
    const token = await getGuestTokenCookie();
    if (!token) {
      return false;
    }

    const payload = await verifyGuestToken(token);
    if (!payload) {
      return false;
    }

    if (needsRotation(payload)) {
      const guestId = payload.sub.replace('guest:', '');
      const newToken = await createGuestToken(guestId);
      await setGuestTokenCookie(newToken);
      return true;
    }

    return false;
  }

  /**
   * Build DataContext from session
   */
  buildContext(session: AppSession, requestId?: string): DataContext {
    return {
      userId: session.user.id,
      userType: session.user.type,
      requestId,
    };
  }
}

/**
 * Get the singleton SessionManager instance
 */
export function getSessionManager(): SessionManager {
  return SessionManager.getInstance();
}

/**
 * Convenience function to get current session
 */
export async function getSession(): Promise<AppSession | null> {
  return getSessionManager().getSession();
}
