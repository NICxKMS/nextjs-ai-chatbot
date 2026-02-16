import { useEffect, useState } from "react"

/** Mobile breakpoint in pixels (matches Tailwind CSS md breakpoint) */
const MOBILE_BREAKPOINT = 768

/**
 * Options for the useIsMobile hook.
 */
export type UseMobileOptions = {
	/** Initial mobile state from server (via x-device-type header) */
	initialIsMobile?: boolean
}

/**
 * A hook to detect if the viewport is mobile-sized.
 * Provides SSR-safe mobile detection with optional server-provided initial value.
 *
 * @param options - Configuration options
 * @returns `true` if viewport is below mobile breakpoint, `undefined` during SSR hydration
 *
 * @example
 * ```tsx
 * // In server component:
 * const headersList = await headers();
 * const isMobile = headersList.get("x-device-type") === "mobile";
 * <ClientComponent initialIsMobile={isMobile} />
 *
 * // In client component:
 * const isMobile = useIsMobile({ initialIsMobile });
 *
 * if (isMobile === undefined) {
 *   return <Skeleton />; // Loading state during hydration
 * }
 *
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useIsMobile(options?: UseMobileOptions): boolean | undefined {
	const { initialIsMobile } = options ?? {}
	const [isMobile, setIsMobile] = useState<boolean | undefined>(
		initialIsMobile,
	)

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		}

		mql.addEventListener("change", onChange)

		// Only update if different from initial value to avoid CLS
		const actualIsMobile = window.innerWidth < MOBILE_BREAKPOINT
		if (actualIsMobile !== initialIsMobile) {
			setIsMobile(actualIsMobile)
		}

		return () => mql.removeEventListener("change", onChange)
	}, [initialIsMobile])

	return isMobile
}

/**
 * A hook that returns detailed device type information.
 * Useful for responsive design decisions beyond simple mobile/desktop.
 *
 * @returns Object with device type flags
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useDeviceType();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileLayout />}
 *     {isTablet && <TabletLayout />}
 *     {isDesktop && <DesktopLayout />}
 *   </div>
 * );
 * ```
 */
export function useDeviceType(): {
	isMobile: boolean
	isTablet: boolean
	isDesktop: boolean
	isReady: boolean
} {
	const [deviceType, setDeviceType] = useState({
		isMobile: false,
		isTablet: false,
		isDesktop: false,
		isReady: false,
	})

	useEffect(() => {
		const updateDeviceType = () => {
			const width = window.innerWidth
			setDeviceType({
				isMobile: width < MOBILE_BREAKPOINT,
				isTablet: width >= MOBILE_BREAKPOINT && width < 1024,
				isDesktop: width >= 1024,
				isReady: true,
			})
		}

		// Initial update
		updateDeviceType()

		// Listen for resize
		window.addEventListener("resize", updateDeviceType)
		return () => window.removeEventListener("resize", updateDeviceType)
	}, [])

	return deviceType
}
