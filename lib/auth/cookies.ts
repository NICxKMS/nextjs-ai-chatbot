import 'server-only';

/**
 * Cookie names used for authentication
 */
export const COOKIE_NAMES = {
  SUPABASE_AUTH: 'sb-access-token',
  GUEST_TOKEN: 'guest_token',
} as const;

/**
 * Default cookie options for auth cookies
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
