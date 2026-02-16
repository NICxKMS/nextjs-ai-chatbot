/**
 * Suggested Actions Component
 *
 * Displays AI-generated action suggestions that users can click to execute.
 *
 * @module features/input/components/suggested-actions
 */

"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { motion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { SuggestedAction } from "../types"

/**
 * Props for SuggestedActions component
 */
export interface SuggestedActionsProps {
	/** Actions to display */
	actions: SuggestedAction[]
	/** Selection handler */
	onSelect: (action: SuggestedAction) => void
	/** Whether actions are disabled */
	disabled?: boolean
	/** Maximum visible actions */
	maxVisible?: number
	/** Additional class names */
	className?: string
}

/**
 * Default suggested actions for new chats
 */
export const DEFAULT_SUGGESTED_ACTIONS: SuggestedAction[] = [
	{
		id: "1",
		label: "What are the advantages of using Next.js?",
		prompt: "What are the advantages of using Next.js?",
		category: "explore",
	},
	{
		id: "2",
		label: "Write code to demonstrate Dijkstra's algorithm",
		prompt: "Write code to demonstrate Dijkstra's algorithm",
		category: "task",
	},
	{
		id: "3",
		label: "Help me write an essay about Silicon Valley",
		prompt: "Help me write an essay about Silicon Valley",
		category: "task",
	},
	{
		id: "4",
		label: "What is the weather in San Francisco?",
		prompt: "What is the weather in San Francisco?",
		category: "explore",
	},
]

/**
 * Suggested actions component with animated appearance
 */
function PureSuggestedActions({
	actions,
	onSelect,
	disabled = false,
	maxVisible = 4,
	className,
}: SuggestedActionsProps) {
	const visibleActions = actions.slice(0, maxVisible)

	return (
		<div
			className={cn("grid w-full gap-2 sm:grid-cols-2", className)}
			data-testid="suggested-actions"
		>
			{visibleActions.map((action, index) => (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					initial={{ opacity: 0, y: 20 }}
					key={action.id}
					transition={{ delay: 0.05 * index }}
				>
					<Button
						className="h-auto w-full whitespace-normal p-3 text-left justify-start"
						disabled={disabled}
						onClick={() => onSelect(action)}
						variant="outline"
					>
						<span className="text-sm">{action.label}</span>
					</Button>
				</motion.div>
			))}
		</div>
	)
}

/**
 * Suggested actions component with memoization for performance
 */
export const SuggestedActions = memo(PureSuggestedActions)
