/**
 * Card Component
 *
 * A flexible card container with header, content, and footer sections.
 *
 * @module components/ui/card
 */

import { forwardRef, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

/**
 * Card container component
 */
const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn(
				"rounded-lg border bg-card text-card-foreground shadow-sm",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
)
Card.displayName = "Card"

/**
 * Card header section
 */
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn("flex flex-col space-y-1.5 p-6", className)}
			ref={ref}
			{...props}
		/>
	),
)
CardHeader.displayName = "CardHeader"

/**
 * Card title component
 */
const CardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn(
				"font-semibold text-2xl leading-none tracking-tight",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
)
CardTitle.displayName = "CardTitle"

/**
 * Card description component
 */
const CardDescription = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn("text-muted-foreground text-sm", className)}
		ref={ref}
		{...props}
	/>
))
CardDescription.displayName = "CardDescription"

/**
 * Card content section
 */
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div className={cn("p-6 pt-0", className)} ref={ref} {...props} />
	),
)
CardContent.displayName = "CardContent"

/**
 * Card footer section
 */
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn("flex items-center p-6 pt-0", className)}
			ref={ref}
			{...props}
		/>
	),
)
CardFooter.displayName = "CardFooter"

/**
 * Card action section for header actions
 */
const CardAction = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn("flex items-center", className)}
			ref={ref}
			{...props}
		/>
	),
)
CardAction.displayName = "CardAction"

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardDescription,
	CardContent,
	CardAction,
}
