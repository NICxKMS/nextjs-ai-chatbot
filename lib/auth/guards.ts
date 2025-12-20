import 'server-only';
import { sessionManager } from './session';
import { AppError } from '@/lib/errors';
import type { AppSession } from './types';

export type Surface = 'action' | 'api' | 'page';

export interface AuthResult {
  session: AppSession;
}

// ============================================================
// SERVER ACTIONS (throw on error)
// ============================================================

/**
 * Require authenticated session for server actions
 * @throws AppError if not authenticated
 */
export async function requireAuth(surface: Surface = 'action'): Promise<AuthResult> {
  const session = await sessionManager.getSession();

  if (!session) {
    throw AppError.unauthorized({ context: { surface } });
  }

  return { session };
}

/**
 * Verify resource ownership
 * @throws AppError if ownership verification fails
 */
export function verifyOwnership(
  resource: { userId: string },
  session: AppSession,
  surface: Surface = 'action'
): void {
  if (resource.userId !== session.user.id) {
    throw AppError.forbidden({
      message: 'You do not have permission to access this resource',
      context: { surface },
    });
  }
}

/**
 * Require non-guest user for restricted actions
 * @throws AppError if user is a guest
 */
export function requireNonGuest(
  session: AppSession,
  surface: Surface = 'action',
  action?: string
): void {
  if (session.user.type === 'guest') {
    throw AppError.forbidden({
      message: action
        ? `Sign in to ${action}`
        : 'Sign in to perform this action',
      context: { surface, code: 'auth:guest_restricted' },
    });
  }
}

/**
 * Require resource exists
 * @throws AppError if resource is null/undefined
 */
export function requireResource<T>(
  resource: T | null | undefined,
  surface: Surface = 'action',
  resourceType = 'resource'
): T {
  if (resource === null || resource === undefined) {
    throw AppError.notFound(resourceType, { context: { surface } });
  }
  return resource;
}

// ============================================================
// API ROUTES (return Response on error)
// ============================================================

/**
 * Require authenticated session for API routes
 * @returns AuthResult or Response with error
 */
export async function requireAuthForRoute(
  surface: Surface = 'api'
): Promise<AuthResult | Response> {
  const session = await sessionManager.getSession();

  if (!session) {
    return AppError.unauthorized({ context: { surface } }).toResponse();
  }

  return { session };
}

/**
 * Verify resource ownership for API routes
 * @returns undefined if valid, Response with error otherwise
 */
export function verifyOwnershipForRoute(
  resource: { userId: string },
  session: AppSession,
  surface: Surface = 'api'
): Response | undefined {
  if (resource.userId !== session.user.id) {
    return AppError.forbidden({
      message: 'You do not have permission to access this resource',
      context: { surface },
    }).toResponse();
  }
  return undefined;
}

/**
 * Require non-guest user for API routes
 * @returns undefined if valid, Response with error otherwise
 */
export function requireNonGuestForRoute(
  session: AppSession,
  surface: Surface = 'api',
  action?: string
): Response | undefined {
  if (session.user.type === 'guest') {
    return AppError.forbidden({
      message: action
        ? `Sign in to ${action}`
        : 'Sign in to perform this action',
      context: { surface, code: 'auth:guest_restricted' },
    }).toResponse();
  }
  return undefined;
}

/**
 * Require resource exists for API routes
 * @returns resource if exists, Response with error otherwise
 */
export function requireResourceForRoute<T>(
  resource: T | null | undefined,
  surface: Surface = 'api',
  resourceType = 'resource'
): T | Response {
  if (resource === null || resource === undefined) {
    return AppError.notFound(resourceType, { context: { surface } }).toResponse();
  }
  return resource;
}

/**
 * Type guard for route handlers
 */
export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
