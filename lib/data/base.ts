/**
 * Data Layer Base Utilities
 * Ref: 03-data-layer-optimal-design.md §8
 */
import 'server-only';

import type { DataContext } from './types';
import type { UserType } from '@/lib/auth/types';

/**
 * Check if user is a guest
 */
export function isGuest(ctx: DataContext): boolean {
  return ctx.userType === 'guest';
}

/**
 * Create a DataContext from user info
 */
export function createContext(
  userId: string,
  userType: UserType,
  requestId?: string
): DataContext {
  return { userId, userType, requestId };
}

/**
 * Validate that a context has a non-guest user
 * Throws if guest
 */
export function requireNonGuest(ctx: DataContext): void {
  if (isGuest(ctx)) {
    throw new Error('This operation requires a registered user');
  }
}
