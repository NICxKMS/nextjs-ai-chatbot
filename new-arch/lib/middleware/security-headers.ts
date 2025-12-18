/**
 * Security Headers Middleware
 *
 * Adds security headers to all responses.
 * These headers protect against common web vulnerabilities.
 */

import type { NextRequest } from "next/server";
import type { MiddlewareContext, MiddlewareFn } from "./types";

/**
 * Security headers applied to all responses.
 */
export const SECURITY_HEADERS: Record<string, string> = {
    /**
     * Prevents the page from being embedded in iframes.
     * Protects against clickjacking attacks.
     */
    "X-Frame-Options": "DENY",

    /**
     * Prevents browsers from MIME-sniffing responses.
     * Ensures browsers respect declared Content-Type.
     */
    "X-Content-Type-Options": "nosniff",

    /**
     * Enables browser's built-in XSS filtering.
     * Legacy header, but still useful for older browsers.
     */
    "X-XSS-Protection": "1; mode=block",

    /**
     * Controls how much referrer information is sent.
     * Balances functionality with privacy.
     */
    "Referrer-Policy": "strict-origin-when-cross-origin",

    /**
     * Restricts browser features.
     * Disables potentially dangerous APIs when not needed.
     */
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",

    /**
     * Prevents DNS prefetching.
     * Minor privacy enhancement.
     */
    "X-DNS-Prefetch-Control": "off",
};

/**
 * Content Security Policy for HTML responses.
 * Using report-only mode initially to avoid breaking functionality.
 */
export const CSP_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

/**
 * Check if request accepts HTML response.
 */
function acceptsHtml(request: NextRequest): boolean {
    const accept = request.headers.get("accept") || "";
    return accept.includes("text/html");
}

/**
 * Security headers middleware.
 *
 * Adds security headers to the middleware context.
 * Headers are applied to the final response by compose.ts.
 *
 * @returns undefined to continue chain
 */
export const securityHeadersMiddleware: MiddlewareFn = (
    request: NextRequest,
    _event,
    context: MiddlewareContext
) => {
    // Add all security headers to context
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        context.responseHeaders.set(key, value);
    }

    // Add CSP for HTML responses (report-only mode)
    if (acceptsHtml(request)) {
        context.responseHeaders.set(
            "Content-Security-Policy-Report-Only",
            CSP_POLICY
        );
    }

    return;
};

/**
 * Get security headers as a plain object.
 * Useful for Next.js config or custom responses.
 */
export function getSecurityHeaders(): Record<string, string> {
    return { ...SECURITY_HEADERS };
}

/**
 * Get CSP header value.
 * Useful for manual header application.
 */
export function getCspPolicy(): string {
    return CSP_POLICY;
}
