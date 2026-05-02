"use client"

import { Label as LabelPrimitive } from "radix-ui"
import type * as React from "react"

import { cn } from "@/lib/utils/cn"

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				"font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				className,
			)}
			{...props}
		/>
	)
}

export { Label }
