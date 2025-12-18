/**
 * Throws an error if the condition is falsy.
 * Use this to enforce invariants in your code.
 *
 * @param condition - The condition to check
 * @param message - The error message if the condition is false
 * @throws Error with the invariant message if condition is falsy
 *
 * @example
 * invariant(user !== null, 'User must be logged in');
 * // TypeScript now knows user is not null
 */
export function invariant(
    condition: unknown,
    message: string
): asserts condition {
    if (!condition) {
        throw new Error(`Invariant: ${message}`);
    }
}

/**
 * Asserts that a value is not null or undefined, returning the value.
 * Use this when you expect a value to exist but need to verify.
 *
 * @param value - The value to check
 * @param message - The error message if the value is null/undefined
 * @returns The non-null, non-undefined value
 * @throws Error if the value is null or undefined
 *
 * @example
 * const element = assert(document.getElementById('app'), 'App element not found');
 * // TypeScript now knows element is HTMLElement, not HTMLElement | null
 */
export function assert<T>(value: T | null | undefined, message: string): T {
    if (value === null || value === undefined) {
        throw new Error(`Assertion: ${message}`);
    }
    return value;
}
