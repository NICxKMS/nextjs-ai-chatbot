/**
 * Next.js Edge Middleware
 *
 * Entry point for Edge middleware. Runs before every request.
 * Handles cross-cutting concerns at the Edge for performance.
 *
 * Chain order:
 * 1. Request ID - Generate/propagate unique request ID
 * 2. Logging - Log request start (non-blocking)
 * 3. Rate Limit - Check rate limits based on route
 * 4. Security Headers - Add security headers to response
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import {
    composeMiddleware,
    loggingMiddleware,
    rateLimitMiddleware,
    requestIdMiddleware,
    securityHeadersMiddleware,
} from "./lib/middleware";

/**
 * Composed middleware chain.
 *
 * Middlewares run in order. If any middleware returns a response,
 * the chain short-circuits and that response is returned.
 */
export const middleware = composeMiddleware(
    // 1. Generate request ID first (used by all other middlewares)
    requestIdMiddleware,

    // 2. Log request start (non-blocking via waitUntil)
    loggingMiddleware,

    // 3. Check rate limits (may return 429)
    rateLimitMiddleware,

    // 4. Add security headers (always continues)
    securityHeadersMiddleware
);

/**
 * Middleware matcher configuration.
 *
 * Excludes static files and Next.js internals for performance.
 * All other routes go through the middleware chain.
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Static file extensions (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
