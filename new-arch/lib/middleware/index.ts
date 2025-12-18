/**
 * Edge Middleware Module
 *
 * Composable middleware system for Next.js Edge Runtime.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import {
 *   composeMiddleware,
 *   requestIdMiddleware,
 *   rateLimitMiddleware,
 *   securityHeadersMiddleware,
 *   loggingMiddleware,
 * } from '@/lib/middleware';
 *
 * export const middleware = composeMiddleware(
 *   requestIdMiddleware,
 *   loggingMiddleware,
 *   rateLimitMiddleware,
 *   securityHeadersMiddleware
 * );
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * };
 * ```
 */

// Composition
export { composeMiddleware, skipRoutes, withRouteMatch } from "./compose";
export {
    logEdgeError,
    logEdgeWarning,
    loggingMiddleware,
} from "./logging";
export { checkEdgeRateLimit, rateLimitMiddleware } from "./rate-limit";
// Middlewares
export { getClientIp, getRequestId, requestIdMiddleware } from "./request-id";
// Routes
export {
    getRouteTier,
    isApiRoute,
    isPublicRoute,
    matchRoute,
    RATE_LIMIT_TIERS,
    ROUTE_RATE_LIMITS,
    shouldBypass,
} from "./routes";
export {
    CSP_POLICY,
    getCspPolicy,
    getSecurityHeaders,
    SECURITY_HEADERS,
    securityHeadersMiddleware,
} from "./security-headers";
// Types
export type {
    MiddlewareConfig,
    MiddlewareContext,
    MiddlewareFn,
    MiddlewareResult,
    RateLimitOptions,
    RateLimitResult,
    RateLimitTier,
    RouteRateLimitConfig,
} from "./types";
