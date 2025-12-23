/**
 * SEC-005: Constant-Time String Comparison Utilities
 *
 * Provides timing-attack resistant string comparison for security-sensitive
 * operations like hash validation, token comparison, and fingerprint checks.
 *
 * The implementation uses XOR-based comparison that always processes all bytes,
 * preventing timing-based side-channel attacks.
 *
 * @module lib/utils/timing-safe
 */

/**
 * Perform a constant-time string comparison to prevent timing attacks.
 *
 * SEC-005: This function always takes the same amount of time regardless
 * of where (or if) the strings differ. Uses XOR comparison to accumulate
 * differences without early return.
 *
 * Edge-compatible: Uses TextEncoder and Uint8Array (Web APIs).
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * // Use for hash comparisons
 * if (constantTimeEqual(stored.uaHash, current.uaHash)) {
 *   // Hashes match
 * }
 * ```
 */
export function constantTimeEqual(a: string, b: string): boolean {
    // Convert strings to byte arrays using TextEncoder (Edge-compatible)
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    const aLen = aBytes.length;
    const bLen = bBytes.length;

    // For different length strings, we still do a full comparison
    // to avoid timing leaks. We compare against the longer string length.
    const maxLen = Math.max(aLen, bLen);

    // XOR-based constant-time comparison
    // All bytes are compared regardless of early mismatches
    // For out-of-bounds access, we use 0 (which will cause XOR difference)
    let result = aLen ^ bLen; // Start with length difference indicator
    for (let i = 0; i < maxLen; i++) {
        const aByte = i < aLen ? aBytes[i]! : 0;
        const bByte = i < bLen ? bBytes[i]! : 0;
        result |= aByte ^ bByte;
    }

    return result === 0;
}

/**
 * Type-safe wrapper for comparing optional strings in constant time.
 *
 * SEC-005: Handles undefined/null values while maintaining timing safety.
 *
 * @param a - First optional string
 * @param b - Second optional string
 * @returns true if both are equal (including both undefined/null)
 */
export function constantTimeEqualOptional(
    a: string | undefined | null,
    b: string | undefined | null
): boolean {
    // Both undefined/null is considered equal
    if (a == null && b == null) {
        return true;
    }

    // One undefined/null and one not - do dummy work before returning
    if (a == null || b == null) {
        // Dummy work to maintain timing consistency
        // Compare against empty string to keep timing similar
        const nonNull = a ?? b ?? "";
        constantTimeEqual(nonNull, "");
        return false;
    }

    return constantTimeEqual(a, b);
}
