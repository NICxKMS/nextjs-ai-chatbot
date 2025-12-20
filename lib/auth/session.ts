import 'server-only';
import { cookies } from 'next/headers';
import { verifyJwt } from './jwt';
import { COOKIE_NAMES } from './cookies';
import type { AppSession, JwtPayload } from './types';

/**
 * SessionManager - Unified session handling
 * Supports both Supabase authenticated users and guest sessions
 */
export class SessionManager {
  private supabaseSecret: Uint8Array | null = null;
  private guestSecret: Uint8Array | null = null;

  constructor() {
    this.supabaseSecret = this.encodeSecret(process.env.SUPABASE_JWT_SECRET);
    this.guestSecret = this.encodeSecret(
      process.env.GUEST_JWT_SECRET ?? process.env.AUTH_SECRET
    );
  }

  private encodeSecret(secret?: string): Uint8Array | null {
    return secret ? new TextEncoder().encode(secret) : null;
  }

  /**
   * Get current session (Supabase first, then guest)
   */
  async getSession(): Promise<AppSession | null> {
    const supabaseSession = await this.getSupabaseSession();
    if (supabaseSession) return supabaseSession;

    return this.getGuestSession();
  }

  /**
   * Get session from explicit access token
   */
  async getSessionFromToken(accessToken: string): Promise<AppSession | null> {
    if (!this.supabaseSecret) return null;

    const payload = await verifyJwt(accessToken, this.supabaseSecret, {
      audience: 'authenticated',
      issuer: this.getSupabaseIssuer(),
    });

    if (!payload?.sub) return null;

    return {
      user: {
        id: payload.sub,
        type: 'regular',
        email: this.extractEmail(payload),
      },
    };
  }

  /**
   * Create a guest session
   * Note: Guest session creation is handled at edge/middleware level
   * This returns current guest session if exists
   */
  async createGuestSession(): Promise<AppSession | null> {
    return this.getGuestSession();
  }

  private async getSupabaseSession(): Promise<AppSession | null> {
    if (!this.supabaseSecret) return null;

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.SUPABASE_AUTH)?.value;
    if (!token) return null;

    return this.getSessionFromToken(token);
  }

  private async getGuestSession(): Promise<AppSession | null> {
    if (!this.guestSecret) return null;

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.GUEST_TOKEN)?.value;
    if (!token) return null;

    const payload = await verifyJwt(token, this.guestSecret);
    if (!payload?.sub || payload.type !== 'guest') return null;

    return {
      user: {
        id: payload.sub,
        type: 'guest',
        email: null,
      },
    };
  }

  private extractEmail(payload: JwtPayload): string | null {
    return payload.email ?? payload.user_metadata?.email ?? null;
  }

  private getSupabaseIssuer(): string | undefined {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? `${url}/auth/v1` : undefined;
  }
}

/** Singleton instance */
export const sessionManager = new SessionManager();

/**
 * Get current app session
 * Convenience function for backward compatibility
 */
export async function getAppSession(): Promise<AppSession | null> {
  return sessionManager.getSession();
}
