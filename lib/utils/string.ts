/**
 * String utility functions for common string operations.
 * @module lib/utils/string
 */

/**
 * Truncates a string to a maximum length, appending an ellipsis if truncated.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the resulting string (including ellipsis)
 * @returns Truncated string with "..." appended if longer than maxLength
 *
 * @example
 * ```ts
 * truncate('Hello, World!', 10) // "Hello, ..."
 * truncate('Short', 10) // "Short" (no truncation needed)
 * truncate('Exactly10', 10) // "Exactly10"
 * ```
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str
	if (maxLength <= 3) return str.slice(0, maxLength)
	return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Converts a string to a URL-friendly slug.
 * Lowercases, replaces spaces and special chars with hyphens, removes non-alphanumeric chars.
 *
 * @param str - The string to slugify
 * @returns URL-friendly slug string
 *
 * @example
 * ```ts
 * slugify('Hello World') // "hello-world"
 * slugify('My Blog Post!') // "my-blog-post"
 * slugify('  Multiple   Spaces  ') // "multiple-spaces"
 * ```
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/[^\w-]+/g, "") // Remove non-word chars (except hyphens)
		.replace(/--+/g, "-") // Replace multiple hyphens with single
		.replace(/^-+/, "") // Remove leading hyphens
		.replace(/-+$/, "") // Remove trailing hyphens
}

/**
 * Capitalizes the first character of a string.
 *
 * @param str - The string to capitalize
 * @returns String with first character capitalized
 *
 * @example
 * ```ts
 * capitalize('hello') // "Hello"
 * capitalize('HELLO') // "HELLO" (only first char affected)
 * capitalize('') // ""
 * ```
 */
export function capitalize(str: string): string {
	if (str.length === 0) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Sanitizes a string for safe HTML display by escaping dangerous characters.
 * This provides basic XSS prevention by encoding HTML entities.
 *
 * @param str - The string to sanitize
 * @returns Sanitized string with HTML entities escaped
 *
 * @example
 * ```ts
 * sanitizeHtml('<script>alert("xss")</script>')
 * // "<script>alert("xss")<&#x2F;script>"
 * sanitizeHtml('Hello & goodbye') // "Hello & goodbye"
 * ```
 */
export function sanitizeHtml(str: string): string {
	return str
		.replace(/&/g, "\u0026amp;")
		.replace(/</g, "\u0026lt;")
		.replace(/>/g, "\u0026gt;")
		.replace(/"/g, "\u0026quot;")
		.replace(/'/g, "\u0026#x27;")
		.replace(/\//g, "\u0026#x2F;")
		.replace(/`/g, "\u0026#x60;")
		.replace(/=/g, "\u0026#x3D;")
}

/**
 * Sanitizes text by removing function call tokens.
 * Removes `<has_function_call>` tokens that may appear in AI-generated content.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text with function call tokens removed
 *
 * @example
 * ```ts
 * sanitizeText('Hello<has_function_call>World') // "HelloWorld"
 * sanitizeText('No tokens here') // "No tokens here"
 * ```
 */
export function sanitizeText(text: string): string {
	return text.replace("<has_function_call>", "")
}
