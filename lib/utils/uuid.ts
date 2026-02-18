/**
 * UUID generation utility functions.
 * @module lib/utils/uuid
 */

/**
 * Generates a cryptographically secure UUID v4 (RFC 4122 compliant).
 *
 * Uses native `crypto.randomUUID()` when available (Node.js 16+, modern browsers),
 * with a secure fallback using `crypto.getRandomValues()`.
 *
 * @returns A UUID v4 string in the format "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 * @throws Error if crypto API is not available
 *
 * @example
 * ```ts
 * const id = generateUUID() // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateUUID(): string {
	// Use native crypto API (Node 16+, all modern browsers)
	// 2-5x faster and cryptographically secure
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID()
	}

	// Secure fallback using crypto.getRandomValues()
	// This ensures cryptographic randomness even in legacy environments
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		const bytes = new Uint8Array(16)
		crypto.getRandomValues(bytes)
		// Set version (4) and variant (8, 9, A, or B) bits per RFC 4122
		// biome-ignore lint/style/noNonNullAssertion: Uint8Array elements are always defined after getRandomValues
		bytes[6] = (bytes[6]! & 0x0f) | 0x40 // Version 4
		// biome-ignore lint/style/noNonNullAssertion: Uint8Array elements are always defined after getRandomValues
		bytes[8] = (bytes[8]! & 0x3f) | 0x80 // Variant 10xx
		const hex = Array.from(bytes, (b) =>
			b.toString(16).padStart(2, "0"),
		).join("")
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
	}

	// Final fallback: throw error instead of using insecure Math.random()
	throw new Error("Crypto API not available - cannot generate secure UUID")
}
