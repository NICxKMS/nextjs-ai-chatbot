"use client";

/**
 * Reduced Motion Hook
 *
 * React hook for respecting user's motion preferences.
 * Detects the prefers-reduced-motion media query and provides
 * utilities for conditionally applying animations.
 *
 * @module shared/hooks/use-reduced-motion
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Motion preference values.
 */
export type MotionPreference = "no-preference" | "reduce";

/**
 * Options for animation based on motion preference.
 */
export interface MotionSafeOptions<T> {
    /** Value to use when motion is allowed */
    animate: T;
    /** Value to use when motion should be reduced */
    reduce: T;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the current reduced motion media query.
 */
function getReducedMotionQuery(): MediaQueryList | null {
    if (typeof window === "undefined") return null;
    return window.matchMedia("(prefers-reduced-motion: reduce)");
}

/**
 * Check if reduced motion is preferred.
 */
function getSnapshot(): boolean {
    const query = getReducedMotionQuery();
    return query?.matches ?? false;
}

/**
 * Server snapshot - assume no preference for SSR.
 */
function getServerSnapshot(): boolean {
    return false;
}

/**
 * Subscribe to changes in motion preference.
 */
function subscribe(callback: () => void): () => void {
    const query = getReducedMotionQuery();
    if (!query) return () => {};

    query.addEventListener("change", callback);
    return () => {
        query.removeEventListener("change", callback);
    };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to detect if the user prefers reduced motion.
 * Updates automatically when the preference changes.
 *
 * @returns boolean - true if reduced motion is preferred
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={{ opacity: 1 }}
 *       transition={{
 *         duration: prefersReducedMotion ? 0 : 0.3,
 *       }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook that returns a value based on motion preference.
 * Useful for conditionally applying animation values.
 *
 * @param options - Object with animate and reduce values
 * @returns The appropriate value based on user preference
 *
 * @example
 * ```tsx
 * function FadeIn({ children }) {
 *   const duration = useMotionSafe({
 *     animate: 0.3,
 *     reduce: 0,
 *   });
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1 }}
 *       transition={{ duration }}
 *     >
 *       {children}
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useMotionSafe<T>(options: MotionSafeOptions<T>): T {
    const prefersReducedMotion = useReducedMotion();
    return prefersReducedMotion ? options.reduce : options.animate;
}

/**
 * Hook that returns motion-safe animation props for framer-motion.
 * Disables animations entirely when reduced motion is preferred.
 *
 * @returns Object with animation props that respect motion preference
 *
 * @example
 * ```tsx
 * function AnimatedCard() {
 *   const motionProps = useMotionSafeProps();
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0, y: 20 }}
 *       animate={{ opacity: 1, y: 0 }}
 *       {...motionProps}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useMotionSafeProps(): {
    transition: { duration: number };
    initial?: false;
} {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
        return {
            initial: false, // Skip initial state, go straight to animate
            transition: { duration: 0 },
        };
    }

    return {
        transition: { duration: 0.2 },
    };
}

/**
 * Hook that returns the motion preference as a string.
 * Useful for CSS custom properties or data attributes.
 *
 * @returns MotionPreference - "reduce" or "no-preference"
 *
 * @example
 * ```tsx
 * function App() {
 *   const motionPreference = useMotionPreference();
 *
 *   return (
 *     <div data-motion={motionPreference}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMotionPreference(): MotionPreference {
    const prefersReducedMotion = useReducedMotion();
    return prefersReducedMotion ? "reduce" : "no-preference";
}

/**
 * Hook that provides a motion-safe transition helper.
 * Returns a function to create transitions that respect motion preference.
 *
 * @returns Function to create motion-safe transitions
 *
 * @example
 * ```tsx
 * function SlideIn() {
 *   const createTransition = useMotionSafeTransition();
 *
 *   return (
 *     <motion.div
 *       initial={{ x: -100 }}
 *       animate={{ x: 0 }}
 *       transition={createTransition({ duration: 0.5, ease: "easeOut" })}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useMotionSafeTransition(): <T extends Record<string, unknown>>(
    transition: T
) => T {
    const prefersReducedMotion = useReducedMotion();

    return useCallback(
        <T extends Record<string, unknown>>(transition: T): T => {
            if (prefersReducedMotion) {
                return {
                    ...transition,
                    duration: 0,
                    delay: 0,
                } as T;
            }
            return transition;
        },
        [prefersReducedMotion]
    );
}

// =============================================================================
// CSS UTILITIES
// =============================================================================

/**
 * Get CSS value based on motion preference.
 * Can be used in inline styles.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <div
 *       style={{
 *         transition: getMotionSafeCSS(prefersReducedMotion, {
 *           animate: "transform 0.3s ease",
 *           reduce: "none",
 *         }),
 *       }}
 *     >
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function getMotionSafeCSS<T>(
    prefersReducedMotion: boolean,
    values: MotionSafeOptions<T>
): T {
    return prefersReducedMotion ? values.reduce : values.animate;
}

/**
 * CSS custom properties for motion-safe animations.
 * Apply to root element and use in CSS.
 *
 * @example
 * ```tsx
 * function App() {
 *   const cssVars = useMotionCSSVariables();
 *
 *   return (
 *     <div style={cssVars}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 *
 * ```css
 * .animated {
 *   transition: transform var(--motion-duration) var(--motion-ease);
 * }
 * ```
 */
export function useMotionCSSVariables(): React.CSSProperties {
    const prefersReducedMotion = useReducedMotion();

    return {
        "--motion-duration": prefersReducedMotion ? "0ms" : "200ms",
        "--motion-duration-fast": prefersReducedMotion ? "0ms" : "100ms",
        "--motion-duration-slow": prefersReducedMotion ? "0ms" : "400ms",
        "--motion-ease": prefersReducedMotion
            ? "linear"
            : "cubic-bezier(0.4, 0, 0.2, 1)",
        "--motion-enabled": prefersReducedMotion ? "0" : "1",
    } as React.CSSProperties;
}
