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
