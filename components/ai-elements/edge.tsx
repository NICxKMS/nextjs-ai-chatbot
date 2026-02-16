/**
 * Edge Element Components
 *
 * Custom edge components for ReactFlow canvas.
 * Provides animated and temporary edge variants.
 *
 * @module components/ai-elements/edge
 */

import {
	BaseEdge,
	type EdgeProps,
	getBezierPath,
	getSimpleBezierPath,
	type InternalNode,
	type Node,
	Position,
	useInternalNode,
} from "@xyflow/react"

/**
 * Temporary edge component for pending connections.
 * Displays dashed line between nodes.
 */
const Temporary = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
}: EdgeProps) => {
	const [edgePath] = getSimpleBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	})

	return (
		<BaseEdge
			className="stroke-1 stroke-ring"
			id={id}
			path={edgePath}
			style={{
				strokeDasharray: "5, 5",
			}}
		/>
	)
}

const getHandleCoordsByPosition = (
	node: InternalNode<Node>,
	handlePosition: Position,
) => {
	// Choose the handle type based on position - Left is for target, Right is for source
	const handleType = handlePosition === Position.Left ? "target" : "source"

	const handle = node.internals.handleBounds?.[handleType]?.find(
		(h) => h.position === handlePosition,
	)

	if (!handle) {
		return [0, 0] as const
	}

	let offsetX = handle.width / 2
	let offsetY = handle.height / 2

	// this is a tiny detail to make the markerEnd of an edge visible.
	// The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
	// when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
	switch (handlePosition) {
		case Position.Left:
			offsetX = 0
			break
		case Position.Right:
			offsetX = handle.width
			break
		case Position.Top:
			offsetY = 0
			break
		case Position.Bottom:
			offsetY = handle.height
			break
		default:
			throw new Error(`Invalid handle position: ${handlePosition}`)
	}

	const x = node.internals.positionAbsolute.x + handle.x + offsetX
	const y = node.internals.positionAbsolute.y + handle.y + offsetY

	return [x, y] as const
}

const getEdgeParams = (
	source: InternalNode<Node>,
	target: InternalNode<Node>,
) => {
	const sourcePos = Position.Right
	const [sx, sy] = getHandleCoordsByPosition(source, sourcePos)
	const targetPos = Position.Left
	const [tx, ty] = getHandleCoordsByPosition(target, targetPos)

	return {
		sx,
		sy,
		tx,
		ty,
		sourcePos,
		targetPos,
	}
}

/**
 * Animated edge component with moving dot indicator.
 * Shows data flow between connected nodes.
 */
const Animated = ({ id, source, target, markerEnd, style }: EdgeProps) => {
	const sourceNode = useInternalNode(source)
	const targetNode = useInternalNode(target)

	if (!(sourceNode && targetNode)) {
		return null
	}

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
		sourceNode,
		targetNode,
	)

	const [edgePath] = getBezierPath({
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos,
		targetX: tx,
		targetY: ty,
		targetPosition: targetPos,
	})

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				{...(markerEnd ? { markerEnd } : {})}
				{...(style ? { style } : {})}
			/>
			<circle fill="var(--primary)" r="4">
				<animateMotion
					dur="2s"
					path={edgePath}
					repeatCount="indefinite"
				/>
			</circle>
		</>
	)
}

/**
 * Edge variants for ReactFlow canvas.
 * - Temporary: Dashed line for pending connections
 * - Animated: Bezier curve with animated dot
 */
export const Edge = {
	Temporary,
	Animated,
}
