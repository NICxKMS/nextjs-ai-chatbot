"use client";

import { useEffect, useState } from "react";

type WindowSize = {
    width: number;
    height: number;
};

type UseWindowSizeReturn = {
    windowSize: WindowSize | null;
    width: number;
    height: number;
    isReady: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
};

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

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
