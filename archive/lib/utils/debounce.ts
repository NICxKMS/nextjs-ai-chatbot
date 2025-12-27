/**
 * Debounce Utility
 *
 * Provides debounce functionality to limit function execution frequency.
 * Useful for user input handlers like search, resize, and scroll events.
 *
 * @module lib/utils/debounce
 */

/**
 * Creates a debounced version of a function that delays execution
 * until after a specified wait time has elapsed since the last call.
 *
 * @param fn - The function to debounce
 * @param waitMs - The number of milliseconds to delay
 * @returns A debounced version of the function with a cancel method
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   searchAPI(query);
 * }, 300);
 *
 * // In input handler
 * onChange={(e) => debouncedSearch(e.target.value)}
 *
 * // Cleanup on unmount
 * useEffect(() => () => debouncedSearch.cancel(), []);
 * ```
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    fn: T,
    waitMs: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<T>) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, waitMs);
    };

    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced;
}

/**
 * Creates a debounced function with leading edge execution.
 * Executes immediately on the first call, then ignores calls
 * until the wait period has elapsed.
 *
 * @param fn - The function to debounce
 * @param waitMs - The number of milliseconds to wait
 * @returns A debounced function with leading execution
 *
 * @example
 * ```ts
 * const handleClick = debounceLeading(() => {
 *   submitForm();
 * }, 1000);
 * ```
 */
export function debounceLeading<
    T extends (...args: Parameters<T>) => ReturnType<T>,
>(
    fn: T,
    waitMs: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let canExecute = true;

    const debounced = (...args: Parameters<T>) => {
        if (canExecute) {
            fn(...args);
            canExecute = false;
        }

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            canExecute = true;
            timeoutId = null;
        }, waitMs);
    };

    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        canExecute = true;
    };

    return debounced;
}
