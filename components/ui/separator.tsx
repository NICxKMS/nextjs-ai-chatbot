/**
 * Separator Component
 *
 * A visual divider component.
 *
 * @module components/ui/separator
 */

import { forwardRef, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
	/** Orientation of the separator */
	orientation?: "horizontal" | "vertical"
	/** Whether the separator is decorative (for accessibility) */
	decorative?: boolean
}

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
	(
		{ className, orientation = "horizontal", decorative = true, ...props },
		ref,
	) => (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-orientation IS valid for role="separator"
		<div
			className={cn(
				"shrink-0 bg-border",
				orientation === "horizontal"
					? "h-[1px] w-full"
					: "h-full w-[1px]",
				className,
			)}
			ref={ref}
			role={decorative ? "none" : "separator"}
			aria-orientation={decorative ? undefined : orientation}
			data-orientation={orientation}
			{...props}
		/>
	),
)
Separator.displayName = "Separator"

export { Separator }
