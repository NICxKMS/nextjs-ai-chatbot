/**
 * Panel Element Component
 *
 * Panel component for ReactFlow canvas.
 * Provides positioned overlay containers.
 *
 * @module components/ai-elements/panel
 */

import { Panel as PanelPrimitive } from "@xyflow/react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils/index"

type PanelProps = ComponentProps<typeof PanelPrimitive>

/**
 * Panel component for ReactFlow overlays.
 * Styled container for controls, legends, etc.
 */
export const Panel = ({ className, ...props }: PanelProps) => (
	<PanelPrimitive
		className={cn(
			"m-4 overflow-hidden rounded-md border bg-card p-1",
			className,
		)}
		{...props}
	/>
)
