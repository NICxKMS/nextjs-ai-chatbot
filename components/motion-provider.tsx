"use client"

import { MotionConfig } from "framer-motion"
import type { ReactNode } from "react"

/**
 * Wraps the app in framer-motion's MotionConfig with `reducedMotion="user"`.
 *
 * This respects the user's `prefers-reduced-motion` OS-level setting for all
 * framer-motion JS-driven spring animations (which CSS media queries cannot reach).
 * CSS animations/transitions are handled separately via the global CSS media query.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
	return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
