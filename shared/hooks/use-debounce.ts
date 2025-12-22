"use client";

/**
 * Debounce Hook
 *
 * React hook for creating a debounced callback.
 * Automatically cancels pending calls on unmount.
 *
 * @module shared/hooks/use-debounce
 */

import { useCallback, useEffect, useRef } from "react";

/**
 * React hook for creating a debounced callback.
 * Automatically cancels pending calls on unmount.
 *
 * @param callback - The callback to debounce
 * @param waitMs - The debounce delay in milliseconds
 * @param deps - Dependency array for the callback
 * @returns A stable debounced callback
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce(
 *   (query: string) => searchAPI(query),
 *   300,
 *   [searchAPI]
 * );
 * ```
 */
export function useDebounce<
    T extends (...args: Parameters<T>) => ReturnType<T>,
>(
    callback: T,
    waitMs: number,
    deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const callbackRef = useRef(callback);

    // Update callback ref when deps change
    useEffect(() => {
        callbackRef.current = callback;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
                timeoutRef.current = null;
            }, waitMs);
        },
        [waitMs]
    );
}
