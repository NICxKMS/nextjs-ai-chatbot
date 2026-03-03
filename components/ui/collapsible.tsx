"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react"
import { cn } from "@/lib/utils/cn"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = forwardRef<
	ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
	ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
	<CollapsiblePrimitive.CollapsibleContent
		className={cn(
			"overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down",
			className,
		)}
		ref={ref}
		{...props}
	>
		{children}
	</CollapsiblePrimitive.CollapsibleContent>
))
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
