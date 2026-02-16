/**
 * Input Group Component
 *
 * A flexible input group component for combining inputs with addons and buttons.
 *
 * @module components/ui/input-group
 */

import {
	type ButtonHTMLAttributes,
	forwardRef,
	type HTMLAttributes,
	type TextareaHTMLAttributes,
} from "react"

import { cn } from "@/lib/utils"

/**
 * Input group container
 */
const InputGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn("flex w-full items-center gap-2", className)}
			ref={ref}
			{...props}
		/>
	),
)
InputGroup.displayName = "InputGroup"

/**
 * Input group addon props
 */
type InputGroupAddonProps = HTMLAttributes<HTMLDivElement> & {
	align?: "block-start" | "block-end" | "inline-start" | "inline-end"
}

/**
 * Input group addon (prefix/suffix)
 */
const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
	({ className, align = "block-end", ...props }, ref) => (
		<div
			className={cn(
				"flex items-center text-muted-foreground",
				align === "block-start" && "order-first",
				align === "block-end" && "order-last",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
)
InputGroupAddon.displayName = "InputGroupAddon"

/**
 * Input group button props
 */
type InputGroupButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "default" | "ghost" | "outline" | "secondary" | "link"
	size?: "default" | "sm" | "lg" | "icon" | "icon-sm"
}

/**
 * Input group button wrapper
 */
const InputGroupButton = forwardRef<HTMLButtonElement, InputGroupButtonProps>(
	({ className, variant = "default", size = "icon", ...props }, ref) => (
		<button
			className={cn(
				"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
				variant === "default" &&
					"bg-primary text-primary-foreground hover:bg-primary/90",
				variant === "ghost" &&
					"hover:bg-accent hover:text-accent-foreground",
				variant === "outline" &&
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				variant === "secondary" &&
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				variant === "link" &&
					"text-primary underline-offset-4 hover:underline",
				size === "default" && "h-10 px-4 py-2",
				size === "sm" && "h-9 rounded-md px-3",
				size === "lg" && "h-11 rounded-md px-8",
				size === "icon" && "h-10 w-10",
				size === "icon-sm" && "h-8 w-8",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
)
InputGroupButton.displayName = "InputGroupButton"

/**
 * Input group textarea
 */
const InputGroupTextarea = forwardRef<
	HTMLTextAreaElement,
	TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
	<textarea
		className={cn(
			"flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
			className,
		)}
		ref={ref}
		{...props}
	/>
))
InputGroupTextarea.displayName = "InputGroupTextarea"

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea }
