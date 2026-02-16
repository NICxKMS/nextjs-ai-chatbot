"use client"

import { useEffect, useState } from "react"

/**
 * Window size dimensions.
 */
export type WindowSize = {
	width: number
	height: number
}

/**
 * Return type for the useWindowSize hook.
 */
export type UseWindowSizeReturn = {
	/** The current window size (null during SSR) */
	windowSize: WindowSize | null
	/** Current window width (0 during SSR) */
	width: number
	/** Current window height (0 during SSR) */
	height: number
	/** Whether the window size has been measured */
	isReady: boolean
	/** Whether the viewport is mobile-sized (< 768px) */
	isMobile: boolean
	/** Whether the viewport is tablet-sized (768px - 1023px) */
	isTablet: boolean
	/** Whether the viewport is desktop-sized (≥ 1024px) */
	isDesktop: boolean
}

/** Mobile breakpoint in pixels */
const MOBILE_BREAKPOINT = 768
/** Tablet breakpoint in pixels */
const TABLET_BREAKPOINT = 1024

/**
 * A hook that tracks the window size and provides responsive breakpoints.
 * SSR-safe with proper hydration handling.
 *
 * @returns Object with window dimensions and device type flags
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { width, height, isMobile, isTablet, isDesktop } = useWindowSize();
 *
 *   if (!isReady) {
 *     return <Skeleton />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Window: {width}x{height}</p>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWindowSize(): UseWindowSizeReturn {
	const [windowSize, setWindowSize] = useState<WindowSize | null>(null)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			})
		}

		// Initial measurement
		handleResize()
		setIsReady(true)

		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	const width = windowSize?.width ?? 0
	const height = windowSize?.height ?? 0

	return {
		windowSize,
		width,
		height,
		isReady,
		isMobile: isReady && width > 0 && width < MOBILE_BREAKPOINT,
		isTablet:
			isReady && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
		isDesktop: isReady && width >= TABLET_BREAKPOINT,
	}
}

/**
 * A hook that returns only the window width.
 * Useful when you only need width for responsive decisions.
 *
 * @returns Object with width and ready state
 *
 * @example
 * ```tsx
 * const { width, isReady } = useWindowWidth();
 * ```
 */
export function useWindowWidth(): { width: number; isReady: boolean } {
	const [width, setWidth] = useState(0)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		function handleResize() {
			setWidth(window.innerWidth)
		}

		handleResize()
		setIsReady(true)

		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	return { width, isReady }
}

/**
 * A hook that returns only the window height.
 * Useful when you only need height for responsive decisions.
 *
 * @returns Object with height and ready state
 *
 * @example
 * ```tsx
 * const { height, isReady } = useWindowHeight();
 * ```
 */
export function useWindowHeight(): { height: number; isReady: boolean } {
	const [height, setHeight] = useState(0)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		function handleResize() {
			setHeight(window.innerHeight)
		}

		handleResize()
		setIsReady(true)

		window.addEventListener("resize", handleResize)
		return () => window.removeEventListener("resize", handleResize)
	}, [])

	return { height, isReady }
}
