"use client"

import { MotionConfig } from "motion/react"
import type { ReactNode } from "react"

/**
 * Wraps a motion-heavy subtree in motion's MotionConfig with
 * `reducedMotion="user"`.
 *
 * This respects the user's `prefers-reduced-motion` OS-level setting for all
 * motion JS-driven spring animations (which CSS media queries cannot reach).
 * CSS animations/transitions are handled separately via the global CSS media query.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
	return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
