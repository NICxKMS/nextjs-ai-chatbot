/**
 * Toolbar Element Component
 *
 * Node toolbar component for ReactFlow canvas.
 * Provides floating toolbar for node actions.
 *
 * @module components/ai-elements/toolbar
 */

import { NodeToolbar, Position } from "@xyflow/react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils/index"

type ToolbarProps = ComponentProps<typeof NodeToolbar>

/**
 * Floating toolbar for ReactFlow nodes.
 * Displays action buttons for selected node.
 */
export const Toolbar = ({ className, ...props }: ToolbarProps) => (
	<NodeToolbar
		className={cn(
			"flex items-center gap-1 rounded-sm border bg-background p-1.5",
			className,
		)}
		position={Position.Bottom}
		{...props}
	/>
)
