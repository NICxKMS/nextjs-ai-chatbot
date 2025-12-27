/**
 * Security Headers Middleware
 * Ref: lib/middleware/security-headers.ts
 *
 * Provides security headers for HTTP responses including CSP and HSTS.
 */

import { type NextRequest, NextResponse } from "next/server";

/**
 * Content Security Policy directives
 * - default-src 'self': Only allow resources from same origin by default
 * - script-src: Allow inline scripts and eval for Next.js hydration
 * - style-src: Allow inline styles for Tailwind CSS
 * - img-src: Allow images from self, data URIs, blobs, and HTTPS sources
 * - font-src: Allow fonts from same origin
 * - connect-src: Allow connections to self, WebSocket, and HTTPS (for AI SDK streaming)
 * - frame-ancestors: Prevent clickjacking (equivalent to X-Frame-Options: DENY)
 */
const CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
] as const;

/**
 * Security headers object
 * Includes all recommended security headers for production use.
 */
const securityHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": CSP_DIRECTIVES.join("; "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
} as const;

/**
 * Apply security headers to a response
 * @param response - The NextResponse to add headers to
 * @returns The response with security headers applied
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
    }
    return response;
}

/**
 * Create a response with security headers applied
 * @param request - The incoming request
 * @returns A NextResponse with security headers
 */
export function withSecurityHeaders(request: NextRequest): NextResponse {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
}

/**
 * Get security headers as a plain object
 * Useful for static exports or API routes
 */
export function getSecurityHeaders(): Record<string, string> {
    return { ...securityHeaders };
}

/**
 * Get CSP header value
 * Useful when only CSP is needed
 */
export function getCSPHeader(): string {
    return securityHeaders["Content-Security-Policy"];
}

/**
 * Get HSTS header value
 * Useful when only HSTS is needed
 */
export function getHSTSHeader(): string {
    return securityHeaders["Strict-Transport-Security"];
}

export { securityHeaders };
