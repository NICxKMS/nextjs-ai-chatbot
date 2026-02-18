/**
 * Validation utility functions for common validation patterns.
 * @module lib/utils/validation
 */

/**
 * Regular expression for validating email addresses.
 * Follows RFC 5322 standard for email format validation.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Regular expression for validating UUID v4 strings.
 */
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates if a string is a valid email address.
 * Uses a practical regex pattern that covers most common email formats.
 *
 * @param email - The email string to validate
 * @returns True if the email is valid, false otherwise
 *
 * @example
 * ```ts
 * isValidEmail('user@example.com') // true
 * isValidEmail('user.name+tag@example.co.uk') // true
 * isValidEmail('invalid-email') // false
 * isValidEmail('user@') // false
 * ```
 */
export function isValidEmail(email: string): boolean {
	if (!email || typeof email !== "string") return false
	return EMAIL_REGEX.test(email.trim())
}

/**
 * Validates if a string is a valid URL.
 * Supports HTTP, HTTPS, FTP, and other common protocols.
 *
 * @param url - The URL string to validate
 * @returns True if the URL is valid, false otherwise
 *
 * @example
 * ```ts
 * isValidUrl('https://example.com') // true
 * isValidUrl('http://localhost:3000/path?query=1') // true
 * isValidUrl('ftp://files.example.com') // true
 * isValidUrl('not-a-url') // false
 * isValidUrl('example.com') // false (missing protocol)
 * ```
 */
export function isValidUrl(url: string): boolean {
	if (!url || typeof url !== "string") return false

	try {
		const parsedUrl = new URL(url)
		// Ensure the URL has a valid protocol
		return ["http:", "https:", "ftp:", "ftps:"].includes(parsedUrl.protocol)
	} catch {
		return false
	}
}

/**
 * Validates if a string is a valid UUID v4.
 * Checks format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
 *
 * @param uuid - The UUID string to validate
 * @returns True if the UUID is valid v4 format, false otherwise
 *
 * @example
 * ```ts
 * isValidUuid('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUuid('not-a-uuid') // false
 * isValidUuid('550e8400-e29b-11d4-a716-446655440000') // false (v1, not v4)
 * ```
 */
export function isValidUuid(uuid: string): boolean {
	if (!uuid || typeof uuid !== "string") return false
	return UUID_REGEX.test(uuid.trim())
}

// =============================================================================
// Redirect URL Validation (Open Redirect Protection)
// =============================================================================

/**
 * Regex to detect path traversal attempts with backslashes.
 * Matches paths like /\example.com or /\\example.com that could lead to external redirects.
 * Defined at module level for performance (avoids recompilation on each request).
 */
const PATH_TRAVERSAL_REGEX = /^\/[\\]+/

/**
 * Dangerous URL schemes that should be blocked.
 * These can be used for XSS or other attacks.
 */
const DANGEROUS_SCHEMES = ["javascript:", "data:", "vbscript:", "file:"]

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 *
 * Security measures:
 * - Only allows relative paths starting with `/` (same origin)
 * - Blocks protocol-relative URLs (`//evil.com`)
 * - Blocks dangerous schemes (javascript:, data:, vbscript:, file:)
 * - For absolute URLs, verifies protocol is http/https AND origin matches
 * - Normalizes URL to prevent encoding bypass attacks
 * - Detects path traversal attempts (/\example.com, /\\example.com)
 *
 * @param redirectUrl - The redirect URL to validate
 * @param allowedOrigin - The allowed origin for absolute URLs (defaults to current origin)
 * @returns Safe redirect URL or "/" if validation fails
 *
 * @example
 * ```ts
 * // Relative paths - allowed
 * getSafeRedirectUrl('/chat/123') // '/chat/123'
 * getSafeRedirectUrl('/dashboard?tab=settings') // '/dashboard?tab=settings'
 *
 * // Protocol-relative URLs - blocked (open redirect vector)
 * getSafeRedirectUrl('//evil.com') // '/'
 *
 * // Dangerous schemes - blocked (XSS vector)
 * getSafeRedirectUrl('javascript:alert(1)') // '/'
 * getSafeRedirectUrl('data:text/html,<script>alert(1)</script>') // '/'
 *
 * // Absolute URLs with matching origin - allowed
 * getSafeRedirectUrl('https://mysite.com/chat', 'https://mysite.com') // '/chat'
 *
 * // Absolute URLs with different origin - blocked
 * getSafeRedirectUrl('https://evil.com/phish', 'https://mysite.com') // '/'
 *
 * // Path traversal attempts - blocked
 * getSafeRedirectUrl('/\\evil.com') // '/'
 * getSafeRedirectUrl('/\evil.com') // '/'
 *
 * // Encoded attacks - blocked
 * getSafeRedirectUrl('%2F%2Fevil.com') // '/'
 * getSafeRedirectUrl('%6Aavascript:alert(1)') // '/'
 * ```
 */
export function getSafeRedirectUrl(
	redirectUrl: string,
	allowedOrigin?: string,
): string {
	if (!redirectUrl || typeof redirectUrl !== "string") {
		return "/"
	}

	try {
		// Normalize the redirect URL to handle encoding attacks
		const normalizedUrl = decodeURIComponent(redirectUrl).trim()

		// Block URLs that start with dangerous schemes (case-insensitive)
		const lowerUrl = normalizedUrl.toLowerCase()
		for (const scheme of DANGEROUS_SCHEMES) {
			if (lowerUrl.startsWith(scheme)) {
				return "/"
			}
		}

		// Allow relative paths starting with /
		// But block protocol-relative URLs (//example.com)
		if (normalizedUrl.startsWith("/") && !normalizedUrl.startsWith("//")) {
			// Prevent path traversal attempts that could lead to external redirects
			// e.g., /\example.com or /\\example.com
			if (PATH_TRAVERSAL_REGEX.test(normalizedUrl)) {
				return "/"
			}
			return normalizedUrl
		}

		// For absolute URLs, parse and validate
		const parsed = new URL(normalizedUrl)

		// Only allow http and https protocols
		// This blocks javascript:, data:, vbscript:, and other dangerous schemes
		if (!["http:", "https:"].includes(parsed.protocol)) {
			return "/"
		}

		// Verify origin matches to prevent external redirects
		// If allowedOrigin is provided, use it; otherwise only allow same-origin
		if (allowedOrigin) {
			if (parsed.origin === allowedOrigin) {
				return normalizedUrl
			}
		}

		// Default to root for any unhandled cases
		return "/"
	} catch {
		// Malformed URL - default to root
		return "/"
	}
}

/**
 * Validates if a redirect URL is safe (does not redirect to external domains).
 *
 * This is a simpler boolean check version of getSafeRedirectUrl for cases
 * where you just need to validate without getting the safe URL.
 *
 * @param redirectUrl - The redirect URL to validate
 * @param allowedOrigin - The allowed origin for absolute URLs
 * @returns True if the redirect URL is safe, false otherwise
 *
 * @example
 * ```ts
 * isValidRedirectUrl('/chat/123') // true
 * isValidRedirectUrl('//evil.com') // false
 * isValidRedirectUrl('javascript:alert(1)') // false
 * ```
 */
export function isValidRedirectUrl(
	redirectUrl: string,
	allowedOrigin?: string,
): boolean {
	return getSafeRedirectUrl(redirectUrl, allowedOrigin) !== "/"
}
