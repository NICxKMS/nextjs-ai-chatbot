/**
 * Lazy Loading Hook
 *
 * React hook for lazy loading components when they enter the viewport.
 *
 * @module lib/utils/use-lazy-load
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { type LazyLoadOptions, observeElement } from "./lazy";

/**
 * Hook for lazy loading content when element enters viewport.
 *
 * @example
 * ```tsx
 * function HeavyComponent() {
 *   const { ref, isLoaded } = useLazyLoad();
 *
 *   return (
 *     <div ref={ref}>
 *       {isLoaded ? <ActualHeavyContent /> : <Skeleton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoad<T extends Element = HTMLDivElement>(
    options: LazyLoadOptions = {}
): {
    ref: React.RefObject<T | null>;
    isLoaded: boolean;
} {
    const ref = useRef<T>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const cleanup = observeElement(
            ref.current,
            () => setIsLoaded(true),
            options
        );
        return cleanup;
    }, [options]);

    return { ref, isLoaded };
}

/**
 * Hook for preloading modules on user interaction.
 *
 * @example
 * ```tsx
 * function OpenEditorButton() {
 *   const preloadProps = usePreloadOnInteraction(() => import('./Editor'));
 *
 *   return (
 *     <button {...preloadProps} onClick={openEditor}>
 *       Open Editor
 *     </button>
 *   );
 * }
 * ```
 */
export function usePreloadOnInteraction(
    loader: () => Promise<unknown>,
    delay = 0
): {
    onMouseEnter: () => void;
    onFocus: () => void;
} {
    const preloadedRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const preload = () => {
        if (preloadedRef.current) {
            return;
        }

        if (delay > 0) {
            if (!timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    loader();
                    preloadedRef.current = true;
                }, delay);
            }
        } else {
            loader();
            preloadedRef.current = true;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        onMouseEnter: preload,
        onFocus: preload,
    };
}

/**
 * Hook for loading a dynamic component with loading state.
 * Includes cleanup for abort handling (P3-080).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { Component, isLoading } = useDynamicImport(
 *     () => import('./HeavyComponent'),
 *     { triggerOnMount: false }
 *   );
 *
 *   return (
 *     <button onClick={trigger}>
 *       {isLoading ? 'Loading...' : <Component />}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDynamicImport<T extends object>(
    loader: () => Promise<{ default: React.ComponentType<T> }>,
    options: { triggerOnMount?: boolean } = {}
): {
    Component: React.ComponentType<T> | null;
    isLoading: boolean;
    error: Error | null;
    trigger: () => void;
} {
    const { triggerOnMount = true } = options;
    const [Component, setComponent] = useState<React.ComponentType<T> | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const loadedRef = useRef(false);
    const cancelledRef = useRef(false);

    const trigger = () => {
        if (loadedRef.current || isLoading) {
            return;
        }

        setIsLoading(true);
        setError(null);
        cancelledRef.current = false;

        loader()
            .then((module) => {
                // P3-080: Check if component was unmounted during load
                if (cancelledRef.current) {
                    return;
                }
                setComponent(() => module.default);
                loadedRef.current = true;
            })
            .catch((err) => {
                // P3-080: Check if component was unmounted during load
                if (cancelledRef.current) {
                    return;
                }
                setError(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => {
                // P3-080: Check if component was unmounted during load
                if (cancelledRef.current) {
                    return;
                }
                setIsLoading(false);
            });
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: trigger is intentionally not memoized
    useEffect(() => {
        if (triggerOnMount) {
            trigger();
        }
        // P3-080: Cleanup - mark as cancelled on unmount
        return () => {
            cancelledRef.current = true;
        };
    }, [triggerOnMount]);

    return { Component, isLoading, error, trigger };
}
