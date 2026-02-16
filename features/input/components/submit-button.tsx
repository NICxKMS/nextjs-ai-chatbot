/**
 * Submit Button Component
 *
 * Submit button with visual states for submitting, disabled, and ready states.
 *
 * @module features/input/components/submit-button
 */

"use client"

import { ArrowUp, Loader2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Props for SubmitButton component
 */
export interface SubmitButtonProps {
	/** Whether submission is in progress */
	isSubmitting: boolean
	/** Whether button is disabled */
	isDisabled: boolean
	/** Whether there is content to submit */
	hasContent: boolean
	/** Click handler */
	onClick: () => void
	/** Additional class names */
	className?: string
}

/**
 * Submit button with visual states
 */
export function SubmitButton({
	isSubmitting,
	isDisabled,
	hasContent,
	onClick,
	className,
}: SubmitButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"size-8 rounded-full transition-colors duration-200",
						isSubmitting
							? "bg-foreground text-background hover:bg-foreground/90"
							: "bg-primary text-primary-foreground hover:bg-primary/90",
						(isDisabled || !hasContent) &&
							"bg-muted text-muted-foreground",
						className,
					)}
					disabled={isDisabled || (!hasContent && !isSubmitting)}
					onClick={onClick}
					size="icon"
					type="button"
				>
					{isSubmitting ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<ArrowUp className="size-4" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{isSubmitting ? "Sending..." : "Send message"}
			</TooltipContent>
		</Tooltip>
	)
}

/**
 * Stop button for cancelling generation
 */
export interface StopButtonProps {
	/** Handler to stop generation */
	onClick: () => void
	/** Additional class names */
	className?: string
}

/**
 * Stop button for cancelling generation
 */
export function StopButton({ onClick, className }: StopButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"size-8 rounded-full bg-foreground text-background transition-colors duration-200 hover:bg-foreground/90",
						className,
					)}
					onClick={onClick}
					size="icon"
					type="button"
				>
					<Square className="size-3" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Stop generating</TooltipContent>
		</Tooltip>
	)
}
