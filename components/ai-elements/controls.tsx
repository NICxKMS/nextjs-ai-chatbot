/**
 * Controls Element Component
 *
 * Zoom/pan controls for ReactFlow canvas.
 * Provides UI for zooming and fitting the canvas view.
 *
 * @module components/ai-elements/controls
 */

"use client"

import { Controls as ControlsPrimitive } from "@xyflow/react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils/index"

export type ControlsProps = ComponentProps<typeof ControlsPrimitive>

/**
 * Canvas controls component for zoom and pan.
 * Styled to match the application theme.
 */
export const Controls = ({ className, ...props }: ControlsProps) => (
	<ControlsPrimitive
		className={cn(
			"gap-px overflow-hidden rounded-md border bg-card p-1 shadow-none!",
			"[&>button]:rounded-md [&>button]:border-none! [&>button]:bg-transparent! [&>button]:hover:bg-secondary!",
			className,
		)}
		{...props}
	/>
)
