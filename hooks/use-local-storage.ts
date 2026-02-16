import { useCallback, useEffect, useState } from "react"

/**
 * Options for the useLocalStorage hook.
 */
export type UseLocalStorageOptions<T> = {
	/** Custom serializer for complex types */
	serializer?: (value: T) => string
	/** Custom deserializer for complex types */
	deserializer?: (value: string) => T
	/** Initialize with this value if localStorage is empty */
	initializeWithValue?: boolean
}

/**
 * A hook for persisting state in localStorage with SSR safety.
 * Automatically handles JSON serialization and hydration.
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no stored value exists
 * @param options - Configuration options
 * @returns A tuple of [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
 *
 * // Set value (automatically persisted)
 * setTheme("dark");
 *
 * // Remove value from localStorage
 * removeTheme();
 * ```
 */
export function useLocalStorage<T>(
	key: string,
	initialValue: T,
	options: UseLocalStorageOptions<T> = {},
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
	const {
		serializer = JSON.stringify,
		deserializer = JSON.parse,
		initializeWithValue = true,
	} = options

	// Check if we're in a browser environment
	const isBrowser = typeof window !== "undefined"

	// Get stored value or return initial
	const getStoredValue = useCallback((): T => {
		if (!isBrowser) {
			return initialValue
		}

		try {
			const stored = window.localStorage.getItem(key)
			if (stored === null) {
				return initialValue
			}
			return deserializer(stored) as T
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error)
			return initialValue
		}
	}, [initialValue, isBrowser, key, deserializer])

	const [storedValue, setStoredValue] = useState<T>(() => {
		if (initializeWithValue) {
			return getStoredValue()
		}
		return initialValue
	})

	// Sync with localStorage on mount (for SSR hydration)
	useEffect(() => {
		if (!initializeWithValue) {
			setStoredValue(getStoredValue())
		}
	}, [initializeWithValue, getStoredValue])

	// Set value and persist to localStorage
	const setValue = useCallback(
		(value: T | ((prev: T) => T)) => {
			if (!isBrowser) {
				console.warn(
					`useLocalStorage: Cannot set value for key "${key}" on server side`,
				)
				return
			}

			try {
				const valueToStore =
					value instanceof Function ? value(storedValue) : value

				setStoredValue(valueToStore)
				window.localStorage.setItem(key, serializer(valueToStore))

				// Dispatch storage event for cross-tab sync
				window.dispatchEvent(
					new StorageEvent("storage", {
						key,
						newValue: serializer(valueToStore),
					}),
				)
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error)
			}
		},
		[key, serializer, storedValue, isBrowser],
	)

	// Remove value from localStorage
	const removeValue = useCallback(() => {
		if (!isBrowser) {
			return
		}

		try {
			window.localStorage.removeItem(key)
			setStoredValue(initialValue)

			// Dispatch storage event for cross-tab sync
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					newValue: null,
				}),
			)
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error)
		}
	}, [initialValue, isBrowser, key])

	// Listen for storage changes from other tabs
	useEffect(() => {
		if (!isBrowser) {
			return
		}

		const handleStorageChange = (event: StorageEvent) => {
			if (event.key !== key) {
				return
			}

			if (event.newValue === null) {
				setStoredValue(initialValue)
			} else {
				try {
					setStoredValue(deserializer(event.newValue) as T)
				} catch (error) {
					console.warn(
						`Error deserializing storage event for key "${key}":`,
						error,
					)
				}
			}
		}

		window.addEventListener("storage", handleStorageChange)
		return () => window.removeEventListener("storage", handleStorageChange)
	}, [key, initialValue, deserializer, isBrowser])

	return [storedValue, setValue, removeValue]
}
