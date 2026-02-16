/**
 * Connection Element Component
 *
 * Custom connection line component for ReactFlow canvas.
 * Displays animated bezier curves between nodes.
 *
 * @module components/ai-elements/connection
 */

import type { ConnectionLineComponent } from "@xyflow/react"

const HALF = 0.5

/**
 * Custom connection line for ReactFlow edges.
 * Renders an animated bezier curve with endpoint indicator.
 */
export const Connection: ConnectionLineComponent = ({
	fromX,
	fromY,
	toX,
	toY,
}) => (
	<g>
		<path
			className="animated"
			d={`M${fromX},${fromY} C ${fromX + (toX - fromX) * HALF},${fromY} ${fromX + (toX - fromX) * HALF},${toY} ${toX},${toY}`}
			fill="none"
			stroke="var(--color-ring)"
			strokeWidth={1}
		/>
		<circle
			cx={toX}
			cy={toY}
			fill="#fff"
			r={3}
			stroke="var(--color-ring)"
			strokeWidth={1}
		/>
	</g>
)
