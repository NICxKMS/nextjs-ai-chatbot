/**
 * UUID Utilities
 * @module new-arch/lib/utils/common/uuid
 */

/**
 * Generate a UUID v4 string
 * Uses the native crypto.randomUUID() when available
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}
