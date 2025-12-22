/**
 * Window Size Hook
 *
 * Tracks browser window dimensions with responsive breakpoint detection.
 * SSR-safe with hydration handling.
 *
 * @module shared/hooks/use-window-size
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Window dimensions.
 */
type WindowSize = {
    width: number;
    height: number;
};

/**
 * Return type for the useWindowSize hook.
 */
type UseWindowSizeReturn = {
    /** Raw window size object (null during SSR) */
    windowSize: WindowSize | null;
    /** Current window width in pixels */
    width: number;
    /** Current window height in pixels */
    height: number;
    /** Whether dimensions have been measured (false during SSR) */
    isReady: boolean;
    /** Whether viewport width is below mobile breakpoint (768px) */
    isMobile: boolean;
    /** Whether viewport width is between mobile and tablet breakpoints */
    isTablet: boolean;
    /** Whether viewport width is at or above tablet breakpoint (1024px) */
    isDesktop: boolean;
};

/** Mobile breakpoint in pixels */
const MOBILE_BREAKPOINT = 768;
/** Tablet breakpoint in pixels */
const TABLET_BREAKPOINT = 1024;

/**
 * Hook for tracking window dimensions with responsive breakpoints.
 *
 * @returns Object with window dimensions and responsive state flags
 *
 * @example
 * ```tsx
 * const { width, isMobile, isDesktop, isReady } = useWindowSize();
 *
 * if (!isReady) return <Loading />;
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 */
export function useWindowSize(): UseWindowSizeReturn {
    const [windowSize, setWindowSize] = useState<WindowSize | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        // Initial measurement
        handleResize();
        setIsReady(true);

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const width = windowSize?.width ?? 0;
    const height = windowSize?.height ?? 0;

    return {
        windowSize,
        width,
        height,
        isReady,
        isMobile: isReady && width > 0 && width < MOBILE_BREAKPOINT,
        isTablet:
            isReady && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: isReady && width >= TABLET_BREAKPOINT,
    };
}
