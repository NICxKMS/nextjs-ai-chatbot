/**
 * Skeleton Component
 *
 * A loading placeholder component.
 *
 * @module components/ui/skeleton
 */

import { forwardRef, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			ref={ref}
			{...props}
		/>
	),
)
Skeleton.displayName = "Skeleton"

export { Skeleton }
