"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_BREAKPOINT = 1280;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DeviceType = "mobile" | "tablet" | "desktop";

export type UseIsMobileOptions = {
    /**
     * Initial mobile state from server (via x-device-type header).
     * Provides hydration-safe SSR by matching server and client initial render.
     */
    initialIsMobile?: boolean;
    /** Custom breakpoint in pixels (default: 768) */
    breakpoint?: number;
};

export type UseBreakpointOptions = {
    /** Initial device type from server */
    initialDeviceType?: DeviceType;
};

export type UseWindowSizeReturn = {
    width: number | undefined;
    height: number | undefined;
};

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Hook to detect mobile viewport.
 *
 * @param options.initialIsMobile - Optional initial value from server for hydration-safe SSR.
 *   Can be obtained from the `x-device-type` header set by the Edge proxy.
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
 * ```
 */
export function useIsMobile(
    options: UseIsMobileOptions = {}
): boolean | undefined {
    const { initialIsMobile, breakpoint = MOBILE_BREAKPOINT } = options;
    const [isMobile, setIsMobile] = useState<boolean | undefined>(
        initialIsMobile
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

        const onChange = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        mql.addEventListener("change", onChange);

        // Only update if different from initial value to avoid CLS
        const actualIsMobile = window.innerWidth < breakpoint;
        if (actualIsMobile !== initialIsMobile) {
            setIsMobile(actualIsMobile);
        }

        return () => mql.removeEventListener("change", onChange);
    }, [initialIsMobile, breakpoint]);

    return isMobile;
}

/**
 * Hook to detect current breakpoint/device type.
 *
 * @example
 * ```tsx
 * const deviceType = useBreakpoint();
 * // deviceType: "mobile" | "tablet" | "desktop"
 * ```
 */
export function useBreakpoint(
    options: UseBreakpointOptions = {}
): DeviceType | undefined {
    const { initialDeviceType } = options;
    const [deviceType, setDeviceType] = useState<DeviceType | undefined>(
        initialDeviceType
    );

    useEffect(() => {
        const getDeviceType = (): DeviceType => {
            const width = window.innerWidth;
            if (width < MOBILE_BREAKPOINT) {
                return "mobile";
            }
            if (width < TABLET_BREAKPOINT) {
                return "tablet";
            }
            return "desktop";
        };

        const handleResize = () => {
            setDeviceType(getDeviceType());
        };

        // Initial check
        const actualDeviceType = getDeviceType();
        if (actualDeviceType !== initialDeviceType) {
            setDeviceType(actualDeviceType);
        }

        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, [initialDeviceType]);

    return deviceType;
}

/**
 * Hook to get current window dimensions.
 *
 * Returns undefined on server and during hydration to prevent mismatches.
 *
 * @example
 * ```tsx
 * const { width, height } = useWindowSize();
 * ```
 */
export function useWindowSize(): UseWindowSizeReturn {
    const [size, setSize] = useState<UseWindowSizeReturn>({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Set initial size
        handleResize();

        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return size;
}

/**
 * Hook for media query matching.
 *
 * @param query - CSS media query string
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 * const isDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
 * ```
 */
export function useMediaQuery(query: string): boolean | undefined {
    const [matches, setMatches] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        const mql = window.matchMedia(query);

        const onChange = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Set initial value
        setMatches(mql.matches);

        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Parse device type from x-device-type header.
 * Use in server components to pass initial state to client.
 *
 * @example
 * ```tsx
 * // In server component
 * const headersList = await headers();
 * const deviceType = parseDeviceTypeHeader(headersList.get("x-device-type"));
 * ```
 */
export function parseDeviceTypeHeader(
    headerValue: string | null
): DeviceType | undefined {
    if (!headerValue) {
        return;
    }
    if (
        headerValue === "mobile" ||
        headerValue === "tablet" ||
        headerValue === "desktop"
    ) {
        return headerValue;
    }
    return;
}

/**
 * Get breakpoint constants for use in styles/calculations.
 */
export const breakpoints = {
    mobile: MOBILE_BREAKPOINT,
    tablet: TABLET_BREAKPOINT,
    desktop: DESKTOP_BREAKPOINT,
} as const;
