/**
 * Suggestion Element Components
 *
 * Components for displaying clickable suggestion chips.
 * Used for quick reply suggestions and action prompts.
 *
 * @module components/ai-elements/suggestion
 */

"use client"

import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils/index"

export type SuggestionsProps = ComponentProps<typeof ScrollArea>

/**
 * Scrollable suggestions container.
 */
export const Suggestions = ({
	className,
	children,
	...props
}: SuggestionsProps) => (
	<ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
		<div
			className={cn(
				"flex w-max flex-nowrap items-center gap-2",
				className,
			)}
		>
			{children}
		</div>
		<ScrollBar className="hidden" orientation="horizontal" />
	</ScrollArea>
)

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
	suggestion: string
	onClick?: (suggestion: string) => void
}

/**
 * Individual suggestion button.
 * Calls onClick with the suggestion string when clicked.
 */
export const Suggestion = ({
	suggestion,
	onClick,
	className,
	variant = "outline",
	size = "sm",
	disabled,
	children,
	...props
}: SuggestionProps) => {
	const handleClick = () => {
		onClick?.(suggestion)
	}

	return (
		<Button
			aria-disabled={disabled}
			aria-label={`Use suggestion: ${suggestion}`}
			className={cn("cursor-pointer rounded-full px-4", className)}
			disabled={disabled}
			onClick={handleClick}
			size={size}
			type="button"
			variant={variant}
			{...props}
		>
			{children || suggestion}
		</Button>
	)
}
