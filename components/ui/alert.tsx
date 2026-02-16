/**
 * Alert Component
 *
 * Displays a callout for user attention with variant styling.
 *
 * @module components/ui/alert
 */

import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
	"relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground",
				destructive:
					"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
)

/**
 * Alert props interface
 */
export interface AlertProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {}

/**
 * Alert container component
 */
function Alert({ className, variant, ...props }: AlertProps) {
	return (
		<div
			className={cn(alertVariants({ variant }), className)}
			role="alert"
			{...props}
		/>
	)
}

/**
 * Alert title component
 */
function AlertTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h5
			className={cn(
				"mb-1 font-medium leading-none tracking-tight",
				className,
			)}
			{...props}
		/>
	)
}

/**
 * Alert description component
 */
function AlertDescription({
	className,
	...props
}: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<div
			className={cn(
				"text-muted-foreground text-sm [&_p]:leading-relaxed",
				className,
			)}
			{...props}
		/>
	)
}

export { Alert, AlertTitle, AlertDescription }
