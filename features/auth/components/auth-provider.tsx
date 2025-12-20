'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/auth/client';
import type { AppSession } from '@/lib/auth';
import type { AuthContextValue } from '../types';

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// AuthProvider Component
// Ref: oldapp/components/auth-provider.tsx
// ============================================================================

export interface AuthProviderProps {
  /** Initial session from server */
  initialSession: AppSession | null;
  children: ReactNode;
}

/**
 * React Context provider for authentication state
 * Manages session state and syncs with Supabase auth events
 */
export function AuthProvider({ initialSession, children }: AuthProviderProps) {
  const [session, setSession] = useState<AppSession | null>(initialSession);
  const [isNewSession, setIsNewSession] = useState(false);

  // Derive auth state from session
  const isAuthenticated = session !== null;
  const isGuest = session?.user?.type === 'guest';
  const isLoading = false; // Loading handled by AuthBootstrap

  // Clear the new session flag when user creates their first chat
  const clearNewSessionFlag = useCallback(() => {
    setIsNewSession(false);
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, supabaseSession: Session | null) => {
        if (event === 'SIGNED_OUT' || !supabaseSession) {
          setSession(null);
          return;
        }

        const user = supabaseSession.user;

        if (!user) {
          setSession(null);
          return;
        }

        setSession({
          user: {
            id: user.id,
            type: 'regular',
            email: user.email ?? null,
          },
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Memoize context value
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated,
      isGuest,
      isLoading,
      isNewSession,
      setSession,
      clearNewSessionFlag,
    }),
    [session, isAuthenticated, isGuest, isLoading, isNewSession, clearNewSessionFlag]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// useAuth Hook
// ============================================================================

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return ctx;
}
