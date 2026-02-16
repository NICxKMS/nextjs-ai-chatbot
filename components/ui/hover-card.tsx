/**
 * Hover Card Component
 *
 * A card that appears when hovering over a trigger element using Radix UI primitives.
 *
 * @module components/ui/hover-card
 */

"use client"

import { HoverCard as HoverCardPrimitive } from "radix-ui"
import {
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
} from "react"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

/**
 * Hover card content component
 */
const HoverCardContent = forwardRef<
	ElementRef<typeof HoverCardPrimitive.Content>,
	ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
	<HoverCardPrimitive.Content
		align={align}
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-[--radix-hover-card-content-transform-origin] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		ref={ref}
		sideOffset={sideOffset}
		{...props}
	/>
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
