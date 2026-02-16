/**
 * Canvas Element Component
 *
 * ReactFlow-based canvas component for building visual node graphs.
 * Used for AI-generated workflows, diagrams, and visualizations.
 *
 * @module components/ai-elements/canvas
 * @see {@link https://xyflow.com/docs/getting-started/}
 */

import { Background, ReactFlow, type ReactFlowProps } from "@xyflow/react"
import type { ReactNode } from "react"
import "@xyflow/react/dist/style.css"

type CanvasProps = ReactFlowProps & {
	children?: ReactNode
}

/**
 * Canvas component for visual node-based editing.
 * Wraps ReactFlow with sensible defaults for AI-generated graphs.
 *
 * Features:
 * - Pan on scroll (not drag)
 * - Selection on drag
 * - Fit view on mount
 * - Delete key support
 */
export const Canvas = ({ children, ...props }: CanvasProps) => (
	<ReactFlow
		deleteKeyCode={["Backspace", "Delete"]}
		fitView
		panOnDrag={false}
		panOnScroll
		selectionOnDrag={true}
		zoomOnDoubleClick={false}
		{...props}
	>
		<Background bgColor="var(--sidebar)" />
		{children}
	</ReactFlow>
)
