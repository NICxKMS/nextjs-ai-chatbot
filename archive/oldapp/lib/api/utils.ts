/**
 * ==============================================================================
 * API UTILITY FUNCTIONS
 * ==============================================================================
 *
 * Common utility functions for API routes.
 */

/**
 * Extract client IP address from request headers.
 * Handles x-forwarded-for (with comma-separated proxies), x-real-ip, and fallback.
 *
 * @param request - Request object
 * @returns Client IP address or "unknown"
 *
 * @example
 * ```typescript
 * const ip = getClientIP(request);
 * const rateLimitResult = await checkRateLimit({ identifier: ip, ... });
 * ```
 */
export function getClientIP(request: Request): string {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is the original client
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIP = forwardedFor.split(",")[0]?.trim();
        if (firstIP) {
            return firstIP;
        }
    }

    // Fallback to x-real-ip (set by some proxies like nginx)
    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    // Final fallback
    return "unknown";
}

/**
 * Create URL search params helper from request.
 *
 * @param request - Request object
 * @returns URLSearchParams object
 *
 * @example
 * ```typescript
 * const searchParams = getSearchParams(request);
 * const id = searchParams.get("id");
 * ```
 */
export function getSearchParams(request: Request): URLSearchParams {
    const url = new URL(request.url);
    return url.searchParams;
}

/**
 * Validate Origin/Referer headers against expected origins for CSRF protection.
 * Should be used for state-changing auth endpoints (POST/PUT/DELETE).
 *
 * @param request - Request object
 * @returns true if origin is valid, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateOrigin(request)) {
 *     return new ChatSDKError("forbidden:auth:csrf", "Invalid origin").toResponse();
 * }
 * ```
 */
export function validateOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestUrl = new URL(request.url);

    // Build list of allowed origins
    const allowedOrigins = new Set<string>();

    // Always allow the request's own origin (handles localhost and production)
    allowedOrigins.add(requestUrl.origin);

    // Allow configured Vercel URL
    if (process.env.VERCEL_URL) {
        allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
    }

    // Allow configured app URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
        allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL);
    }

    // Development: also allow localhost variations
    if (process.env.NODE_ENV === "development") {
        allowedOrigins.add("http://localhost:3000");
        allowedOrigins.add("http://127.0.0.1:3000");
    }

    // Check Origin header (preferred for CSRF protection)
    if (origin) {
        return allowedOrigins.has(origin);
    }

    // Fallback to Referer header
    if (referer) {
        try {
            const refererUrl = new URL(referer);
            return allowedOrigins.has(refererUrl.origin);
        } catch {
            return false;
        }
    }

    // No Origin or Referer header - reject for POST/mutation requests
    // This can happen with some privacy extensions, but better to be safe
    return false;
}
