/**
 * Authentication types for the application
 * @module lib/auth/types
 */

export type UserType = 'guest' | 'regular';

export interface AppUser {
  id: string;
  type: UserType;
  email?: string | null;
}

export interface AppSession {
  user: AppUser;
}

export type AuthState = 
  | { status: 'loading' }
  | { status: 'authenticated'; session: AppSession }
  | { status: 'unauthenticated' };

export interface JwtPayload {
  sub?: string;
  type?: 'guest' | string;
  email?: string;
  exp?: number;
  iat?: number;
  aud?: string | string[];
  iss?: string;
  user_metadata?: { email?: string };
}
