"use client"

/**
 * Textarea Component
 *
 * A styled textarea component built on native HTML textarea.
 *
 * @module components/ui/textarea
 */

import { forwardRef, type TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea component props
 */
export interface TextareaProps
	extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea component
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => (
		<textarea
			className={cn(
				"flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
)
Textarea.displayName = "Textarea"

export { Textarea }
