import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export interface UseMobileOptions {
    /** Initial mobile state from server (via x-device-type header) */
    initialIsMobile?: boolean;
}

/**
 * Hook to detect mobile viewport.
 *
 * @param options.initialIsMobile - Optional initial value from server for hydration-safe SSR.
 *   Can be obtained from the `x-device-type` header set by the Edge proxy.
 *
 * @example
 * // In server component:
 * const headersList = await headers();
 * const isMobile = headersList.get("x-device-type") === "mobile";
 * <ClientComponent initialIsMobile={isMobile} />
 *
 * // In client component:
 * const isMobile = useIsMobile({ initialIsMobile });
 */
export function useIsMobile(options?: UseMobileOptions) {
    const { initialIsMobile } = options ?? {};
    const [isMobile, setIsMobile] = useState<boolean | undefined>(
        initialIsMobile
    );

    useEffect(() => {
        const mql = window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
        );
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener("change", onChange);
        // Only update if different from initial value to avoid CLS
        const actualIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
        if (actualIsMobile !== initialIsMobile) {
            setIsMobile(actualIsMobile);
        }
        return () => mql.removeEventListener("change", onChange);
    }, [initialIsMobile]);

    return isMobile;
}
