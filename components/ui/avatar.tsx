/**
 * Avatar Component
 *
 * Displays an avatar image with fallback support using Radix UI primitives.
 *
 * @module components/ui/avatar
 */

"use client"

import { Avatar as AvatarPrimitive } from "radix-ui"
import {
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
} from "react"

import { cn } from "@/lib/utils"

/**
 * Avatar root container
 */
const Avatar = forwardRef<
	ElementRef<typeof AvatarPrimitive.Root>,
	ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
	<AvatarPrimitive.Root
		className={cn(
			"relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
			className,
		)}
		ref={ref}
		{...props}
	/>
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * Avatar image component
 */
const AvatarImage = forwardRef<
	ElementRef<typeof AvatarPrimitive.Image>,
	ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
	<AvatarPrimitive.Image
		className={cn("aspect-square h-full w-full", className)}
		ref={ref}
		{...props}
	/>
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

/**
 * Avatar fallback component shown when image fails to load
 */
const AvatarFallback = forwardRef<
	ElementRef<typeof AvatarPrimitive.Fallback>,
	ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
	<AvatarPrimitive.Fallback
		className={cn(
			"flex h-full w-full items-center justify-center rounded-full bg-muted",
			className,
		)}
		ref={ref}
		{...props}
	/>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
