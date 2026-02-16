import { useCallback, useEffect, useState } from "react"

/**
 * Options for the useMediaQuery hook.
 */
export type UseMediaQueryOptions = {
	/** Default value for SSR (server-side rendering) */
	defaultValue?: boolean
	/** Whether to initialize with the default value immediately */
	initializeWithValue?: boolean
}

/**
 * A hook that tracks the state of a CSS media query.
 * Useful for responsive design and conditional rendering based on viewport.
 *
 * @param query - The CSS media query to track
 * @param options - Configuration options
 * @returns Boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 * const canHover = useMediaQuery("(hover: hover)");
 *
 * return (
 *   <div>
 *     {isMobile ? <MobileNav /> : <DesktopNav />}
 *   </div>
 * );
 * ```
 */
export function useMediaQuery(
	query: string,
	options: UseMediaQueryOptions = {},
): boolean {
	const { defaultValue = false, initializeWithValue = true } = options

	// Check if we're in a browser environment
	const isBrowser = typeof window !== "undefined"

	// Get the initial match state
	const getMatches = useCallback((): boolean => {
		if (!isBrowser) {
			return defaultValue
		}
		return window.matchMedia(query).matches
	}, [query, defaultValue, isBrowser])

	const [matches, setMatches] = useState<boolean>(() => {
		if (initializeWithValue) {
			return getMatches()
		}
		return defaultValue
	})

	// Sync on mount if not initialized
	useEffect(() => {
		if (!initializeWithValue) {
			setMatches(getMatches())
		}
	}, [initializeWithValue, getMatches])

	useEffect(() => {
		if (!isBrowser) {
			return
		}

		const matchMedia = window.matchMedia(query)

		// Update state on change
		const handleChange = (event: MediaQueryListEvent) => {
			setMatches(event.matches)
		}

		// Set initial value
		setMatches(matchMedia.matches)

		// Use addEventListener for modern browsers
		matchMedia.addEventListener("change", handleChange)

		return () => {
			matchMedia.removeEventListener("change", handleChange)
		}
	}, [query, isBrowser])

	return matches
}

/**
 * Predefined breakpoint hooks for common responsive patterns.
 * These match Tailwind CSS default breakpoints.
 */

/**
 * Hook that returns true if viewport is below the sm breakpoint (< 640px).
 */
export function useIsXs(): boolean {
	return useMediaQuery("(max-width: 639px)")
}

/**
 * Hook that returns true if viewport is at or above the sm breakpoint (≥ 640px).
 */
export function useIsSm(): boolean {
	return useMediaQuery("(min-width: 640px)")
}

/**
 * Hook that returns true if viewport is at or above the md breakpoint (≥ 768px).
 */
export function useIsMd(): boolean {
	return useMediaQuery("(min-width: 768px)")
}

/**
 * Hook that returns true if viewport is at or above the lg breakpoint (≥ 1024px).
 */
export function useIsLg(): boolean {
	return useMediaQuery("(min-width: 1024px)")
}

/**
 * Hook that returns true if viewport is at or above the xl breakpoint (≥ 1280px).
 */
export function useIsXl(): boolean {
	return useMediaQuery("(min-width: 1280px)")
}

/**
 * Hook that returns true if viewport is at or above the 2xl breakpoint (≥ 1536px).
 */
export function useIs2Xl(): boolean {
	return useMediaQuery("(min-width: 1536px)")
}

/**
 * Hook that returns true if user prefers reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
	return useMediaQuery("(prefers-reduced-motion: reduce)")
}

/**
 * Hook that returns true if user prefers dark color scheme.
 */
export function usePrefersDarkMode(): boolean {
	return useMediaQuery("(prefers-color-scheme: dark)")
}

/**
 * Hook that returns true if the device supports hover.
 */
export function useHasHover(): boolean {
	return useMediaQuery("(hover: hover)")
}

/**
 * Hook that returns true if the device is in portrait orientation.
 */
export function useIsPortrait(): boolean {
	return useMediaQuery("(orientation: portrait)")
}
