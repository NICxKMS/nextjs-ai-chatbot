/**
 * Checkpoint Element Components
 *
 * Components for displaying checkpoint/restore points in AI conversations.
 * Used for message branching and conversation state management.
 *
 * @module components/ai-elements/checkpoint
 */

"use client"

import { BookmarkIcon, type LucideProps } from "lucide-react"
import type { ComponentProps, HTMLAttributes } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/index"

export type CheckpointProps = HTMLAttributes<HTMLDivElement>

/**
 * Root checkpoint container component.
 * Displays a checkpoint marker with separator.
 */
export const Checkpoint = ({
	className,
	children,
	...props
}: CheckpointProps) => (
	<div
		className={cn(
			"flex items-center gap-0.5 overflow-hidden text-muted-foreground",
			className,
		)}
		{...props}
	>
		{children}
		<Separator />
	</div>
)

export type CheckpointIconProps = LucideProps

/**
 * Checkpoint icon component.
 * Displays bookmark icon by default or custom children.
 */
export const CheckpointIcon = ({
	className,
	children,
	...props
}: CheckpointIconProps) =>
	children ?? (
		<BookmarkIcon className={cn("size-4 shrink-0", className)} {...props} />
	)

export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
	tooltip?: string
}

/**
 * Checkpoint trigger button with optional tooltip.
 * Used to restore or navigate to a checkpoint.
 */
export const CheckpointTrigger = ({
	children,
	className,
	variant = "ghost",
	size = "sm",
	tooltip,
	...props
}: CheckpointTriggerProps) =>
	tooltip ? (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button size={size} type="button" variant={variant} {...props}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent align="start" side="bottom">
				{tooltip}
			</TooltipContent>
		</Tooltip>
	) : (
		<Button size={size} type="button" variant={variant} {...props}>
			{children}
		</Button>
	)
