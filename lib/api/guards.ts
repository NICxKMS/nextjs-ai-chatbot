/**
 * API Guards
 * @module lib/api/guards
 *
 * Security guards for API routes:
 * - Origin verification for CSRF protection
 * - Content-Type validation
 * - Bearer token extraction
 *
 * All guards throw AppError on failure.
 */

import 'server-only';

import { AppError } from '@/lib/errors';

/**
 * Verify request origin matches host for CSRF protection
 * @throws AppError if origin doesn't match
 */
export function verifyOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Skip for non-mutating requests (GET, HEAD, OPTIONS)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return;
  }

  // Origin header is required for mutating requests
  if (!origin) {
    throw new AppError({
      code: 'auth:forbidden',
      message: 'Missing origin header',
      context: { method },
    });
  }

  // Parse origin URL to get hostname
  let originHost: string;
  try {
    const url = new URL(origin);
    originHost = url.host;
  } catch {
    throw new AppError({
      code: 'auth:forbidden',
      message: 'Invalid origin header',
      context: { origin },
    });
  }

  // Verify origin matches host
  if (originHost !== host) {
    throw new AppError({
      code: 'auth:forbidden',
      message: 'Origin mismatch',
      context: { origin: originHost, host },
    });
  }
}

/**
 * Verify request has expected Content-Type
 * @param request - Incoming request
 * @param expected - Expected content type (default: 'application/json')
 * @throws AppError if content type doesn't match
 */
export function verifyContentType(
  request: Request,
  expected: string = 'application/json'
): void {
  const contentType = request.headers.get('content-type');

  // Skip for requests without body
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(method)) {
    return;
  }

  if (!contentType) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: 'Missing Content-Type header',
      context: { expected },
    });
  }

  // Check if content type starts with expected value (handles charset suffix)
  if (!contentType.toLowerCase().startsWith(expected.toLowerCase())) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: `Invalid Content-Type: expected ${expected}`,
      context: { contentType, expected },
    });
  }
}

/**
 * Extract Bearer token from Authorization header
 * @param request - Incoming request
 * @returns The extracted token
 * @throws AppError if Authorization header is missing or malformed
 */
export function extractBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    throw AppError.unauthorized({
      message: 'Missing Authorization header',
    });
  }

  const parts = authorization.split(' ');
  const scheme = parts[0];
  const token = parts[1];

  if (parts.length !== 2 || !scheme || scheme.toLowerCase() !== 'bearer') {
    throw AppError.unauthorized({
      message: 'Invalid Authorization header format',
      context: { format: 'Expected: Bearer <token>' },
    });
  }

  if (!token || token.trim() === '') {
    throw AppError.unauthorized({
      message: 'Empty bearer token',
    });
  }

  return token;
}
