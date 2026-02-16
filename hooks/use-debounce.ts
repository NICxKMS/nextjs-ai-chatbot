import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Options for the useDebounce hook.
 */
export type UseDebounceOptions = {
	/** Delay in milliseconds before the value updates (default: 300) */
	delay?: number
	/** Whether to run the debounce on the leading edge (immediately) */
	leading?: boolean
}

/**
 * A hook that debounces a value over time.
 * Useful for delaying updates until the user has stopped typing or interacting.
 *
 * @param value - The value to debounce
 * @param options - Configuration options
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearch = useDebounce(searchTerm, { delay: 500 });
 *
 * useEffect(() => {
 *   // This effect only runs 500ms after the user stops typing
 *   searchAPI(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, options: UseDebounceOptions = {}): T {
	const { delay = 300, leading = false } = options
	const [debouncedValue, setDebouncedValue] = useState<T>(value)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const leadingRef = useRef(true)

	const cancel = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [])

	useEffect(() => {
		// Handle leading edge - update immediately on first change
		if (leading && leadingRef.current) {
			setDebouncedValue(value)
			leadingRef.current = false
		}

		cancel()

		timeoutRef.current = setTimeout(() => {
			setDebouncedValue(value)
			leadingRef.current = true // Reset for next debounce cycle
		}, delay)

		return cancel
	}, [value, delay, leading, cancel])

	return debouncedValue
}

/**
 * A hook that provides a debounced callback function.
 * The callback will only execute after the specified delay has passed
 * since the last invocation.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToAPI(data);
 * }, 500);
 *
 * // Called on every keystroke, but only executes 500ms after last call
 * onChange={(e) => debouncedSave(e.target.value)}
 * ```
 */
export function useDebouncedCallback<
	T extends (...args: Parameters<T>) => void,
>(callback: T, delay: number = 300): (...args: Parameters<T>) => void {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const callbackRef = useRef(callback)

	// Keep callback ref updated
	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	const debouncedCallback = useCallback(
		(...args: Parameters<T>) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = setTimeout(() => {
				callbackRef.current(...args)
			}, delay)
		},
		[delay],
	)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return debouncedCallback
}
