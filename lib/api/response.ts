/**
 * API Response Utilities
 * @module lib/api/response
 *
 * Standardized response helpers for API routes:
 * - JSON response with proper headers
 * - Success/error response patterns
 * - Common HTTP responses (no content, redirect)
 * - Standard headers
 */

import 'server-only';

import { AppError } from '@/lib/errors';

/**
 * Standard headers for API responses
 */
export const HEADERS = {
  /** JSON content type */
  JSON: { 'Content-Type': 'application/json' },
  /** Stream content type */
  STREAM: { 'Content-Type': 'text/event-stream' },
  /** No cache headers */
  NO_CACHE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  },
  /** CORS headers for public APIs */
  CORS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
} as const;

/**
 * Response options
 */
interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

/**
 * Create a JSON response with proper headers
 * @param data - Data to serialize as JSON
 * @param options - Response options (status, headers)
 * @returns Response with JSON body
 *
 * @example
 * ```ts
 * return json({ user: { id: '123', name: 'John' } });
 * return json({ error: 'Not found' }, { status: 404 });
 * ```
 */
export function json<T>(data: T, options: ResponseOptions = {}): Response {
  const { status = 200, headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...HEADERS.JSON,
      ...headers,
    },
  });
}

/**
 * Create a success response with data wrapper
 * @param data - Success payload
 * @param options - Response options
 * @returns Response with { success: true, data } body
 *
 * @example
 * ```ts
 * return success({ id: '123', title: 'New Chat' });
 * // Response: { success: true, data: { id: '123', title: 'New Chat' } }
 * ```
 */
export function success<T>(data: T, options: ResponseOptions = {}): Response {
  return json({ success: true, data }, options);
}

/**
 * Create an error response from AppError or error details
 * @param error - AppError instance or error details
 * @returns Response with error body and appropriate status
 *
 * @example
 * ```ts
 * // From AppError
 * return errorResponse(AppError.notFound('chat'));
 *
 * // From error details
 * return errorResponse({
 *   code: 'validation:invalid_input',
 *   message: 'Invalid email format',
 *   status: 400,
 * });
 * ```
 */
export function errorResponse(
  error:
    | AppError
    | {
        code: string;
        message: string;
        status?: number;
        context?: Record<string, unknown>;
      }
): Response {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  const { code, message, status = 500, context } = error;

  return json(
    {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && context && { context }),
    },
    { status }
  );
}

/**
 * Create a 204 No Content response
 * @returns Empty response with 204 status
 *
 * @example
 * ```ts
 * // After successful DELETE
 * return noContent();
 * ```
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a redirect response
 * @param url - URL to redirect to
 * @param status - HTTP status (301, 302, 303, 307, 308)
 * @returns Redirect response
 *
 * @example
 * ```ts
 * return redirect('/login', 303);
 * return redirect('/new-location', 301);
 * ```
 */
export function redirect(
  url: string,
  status: 301 | 302 | 303 | 307 | 308 = 302
): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

/**
 * Create a streaming response
 * @param stream - ReadableStream to send
 * @param options - Response options
 * @returns Streaming response
 *
 * @example
 * ```ts
 * const stream = new ReadableStream({ ... });
 * return streaming(stream);
 * ```
 */
export function streaming(
  stream: ReadableStream,
  options: ResponseOptions = {}
): Response {
  const { status = 200, headers = {} } = options;

  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    },
  });
}

/**
 * Create an OPTIONS response for CORS preflight
 * @param allowedMethods - Methods to allow
 * @returns Response with CORS headers
 */
export function corsOptions(
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
