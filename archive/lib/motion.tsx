/**
 * Motion/Animation Utilities
 *
 * Re-exports framer-motion components with lazy-loading support.
 * Uses LazyMotion for optimal bundle size (dom animation features only).
 *
 * @module lib/motion
 */

"use client";

import { domAnimation, LazyMotion } from "framer-motion";

/**
 * Re-export commonly used framer-motion components.
 * Using `m` as `motion` for tree-shaking with LazyMotion.
 */
export {
    AnimatePresence,
    domAnimation,
    LazyMotion,
    m as motion,
    useMotionValue,
    useTransform,
} from "framer-motion";

import type { ReactNode } from "react";

/**
 * Props for the MotionProvider component.
 */
export type MotionProviderProps = {
    /** Child components to wrap with motion features */
    children: ReactNode;
};

/**
 * Provider component for framer-motion with lazy-loaded DOM features.
 *
 * Wraps the application to enable motion animations with optimal bundle size.
 * Uses strict mode to ensure proper usage of motion components.
 *
 * @example
 * ```tsx
 * <MotionProvider>
 *   <motion.div animate={{ opacity: 1 }}>Hello</motion.div>
 * </MotionProvider>
 * ```
 */
export function MotionProvider({ children }: MotionProviderProps) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}
