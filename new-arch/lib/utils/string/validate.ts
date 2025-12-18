/**
 * UUID v4 regex pattern.
 */
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern (simplified but practical).
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks if a string is a valid UUID v4.
 *
 * @param str - The string to validate
 * @returns True if the string is a valid UUID v4
 *
 * @example
 * isUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isUUID('not-a-uuid') // false
 */
export function isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
}

/**
 * Checks if a string is a valid email address.
 *
 * @param str - The string to validate
 * @returns True if the string appears to be a valid email
 *
 * @example
 * isEmail('user@example.com') // true
 * isEmail('invalid-email') // false
 */
export function isEmail(str: string): boolean {
    return EMAIL_REGEX.test(str);
}

/**
 * Checks if a value is empty (null, undefined, empty string, or whitespace-only).
 *
 * @param value - The value to check
 * @returns True if the value is considered empty
 *
 * @example
 * isEmpty(null) // true
 * isEmpty('') // true
 * isEmpty('  ') // true
 * isEmpty('hello') // false
 */
export function isEmpty(value: string | null | undefined): boolean {
    return value === null || value === undefined || value.trim() === "";
}

/**
 * Checks if a string is a valid URL.
 *
 * @param str - The string to validate
 * @returns True if the string is a valid URL
 *
 * @example
 * isURL('https://example.com') // true
 * isURL('not a url') // false
 */
export function isURL(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a string is valid JSON.
 *
 * @param str - The string to validate
 * @returns True if the string is valid JSON
 *
 * @example
 * isJSON('{"key": "value"}') // true
 * isJSON('not json') // false
 */
export function isJSON(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}
