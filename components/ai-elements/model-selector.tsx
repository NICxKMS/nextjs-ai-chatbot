"use client"

/**
 * Model Selector — compound primitive components.
 *
 * Adapted from `oldapp/components/elements/model-selector.tsx`.
 * Original used Dialog + Command (cmdk) which are not available in the new
 * project. Simplified to use Popover from radix-ui for equivalent searchable
 * dropdown behavior with fewer dependencies.
 *
 * These are pure styling/layout primitives — no business logic.
 * Feature-specific logic lives in `features/models/components/model-selector.tsx`.
 */

import { Search } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"
import {
	type ComponentProps,
	type ElementRef,
	type HTMLAttributes,
	forwardRef,
} from "react"

import { cn } from "@/lib/utils/cn"

// ── Root ────────────────────────────────────────────────────────────────────

export type ModelSelectorRootProps = ComponentProps<typeof PopoverPrimitive.Root>

export const ModelSelectorRoot = PopoverPrimitive.Root

// ── Trigger ─────────────────────────────────────────────────────────────────

export type ModelSelectorTriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger>

export const ModelSelectorTrigger = PopoverPrimitive.Trigger

// ── Content ─────────────────────────────────────────────────────────────────

export type ModelSelectorContentProps = ComponentProps<typeof PopoverPrimitive.Content>

export const ModelSelectorContent = forwardRef<
	ElementRef<typeof PopoverPrimitive.Content>,
	ModelSelectorContentProps
>(({ className, align = "start", sideOffset = 4, children, ...props }, ref) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			ref={ref}
			align={align}
			sideOffset={sideOffset}
			className={cn(
				"z-50 w-80 overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				className,
			)}
			{...props}
		>
			{children}
		</PopoverPrimitive.Content>
	</PopoverPrimitive.Portal>
))
ModelSelectorContent.displayName = "ModelSelectorContent"

// ── Input ───────────────────────────────────────────────────────────────────

export type ModelSelectorInputProps = ComponentProps<"input">

export const ModelSelectorInput = forwardRef<HTMLInputElement, ModelSelectorInputProps>(
	({ className, ...props }, ref) => (
		<div className="flex items-center border-b px-3" data-slot="model-selector-input-wrapper">
			<Search className="mr-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
			<input
				ref={ref}
				className={cn(
					"flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	),
)
ModelSelectorInput.displayName = "ModelSelectorInput"

// ── List ────────────────────────────────────────────────────────────────────

export type ModelSelectorListProps = HTMLAttributes<HTMLDivElement>

export const ModelSelectorList = forwardRef<HTMLDivElement, ModelSelectorListProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("max-h-72 overflow-y-auto p-1", className)}
			role="listbox"
			{...props}
		/>
	),
)
ModelSelectorList.displayName = "ModelSelectorList"

// ── Group ───────────────────────────────────────────────────────────────────

export type ModelSelectorGroupProps = HTMLAttributes<HTMLDivElement> & {
	heading?: string
}

export const ModelSelectorGroup = forwardRef<HTMLDivElement, ModelSelectorGroupProps>(
	({ className, heading, children, ...props }, ref) => (
		<div ref={ref} className={cn("", className)} role="group" aria-label={heading} {...props}>
			{heading && (
				<div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
					{heading}
				</div>
			)}
			{children}
		</div>
	),
)
ModelSelectorGroup.displayName = "ModelSelectorGroup"

// ── Item ────────────────────────────────────────────────────────────────────

export type ModelSelectorItemProps = HTMLAttributes<HTMLButtonElement> & {
	selected?: boolean
	disabled?: boolean
}

export const ModelSelectorItem = forwardRef<HTMLButtonElement, ModelSelectorItemProps>(
	({ className, selected, disabled, ...props }, ref) => (
		<button
			ref={ref}
			type="button"
			role="option"
			aria-selected={selected}
			aria-disabled={disabled}
			disabled={disabled}
			className={cn(
				"relative flex w-full cursor-default select-none items-start gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
				selected && "bg-accent/50",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
			{...props}
		/>
	),
)
ModelSelectorItem.displayName = "ModelSelectorItem"

// ── Empty ───────────────────────────────────────────────────────────────────

export type ModelSelectorEmptyProps = HTMLAttributes<HTMLDivElement>

export const ModelSelectorEmpty = forwardRef<HTMLDivElement, ModelSelectorEmptyProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("py-6 text-center text-sm text-muted-foreground", className)}
			{...props}
		/>
	),
)
ModelSelectorEmpty.displayName = "ModelSelectorEmpty"

// ── Logo ────────────────────────────────────────────────────────────────────

export type ModelSelectorLogoProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
	provider: string
}

export const ModelSelectorLogo = ({ provider, className, ...props }: ModelSelectorLogoProps) => (
	<img
		{...props}
		alt={`${provider} logo`}
		className={cn("size-4 shrink-0 dark:invert", className)}
		height={16}
		src={`https://models.dev/logos/${provider}.svg`}
		width={16}
	/>
)

// ── LogoGroup ───────────────────────────────────────────────────────────────

export type ModelSelectorLogoGroupProps = HTMLAttributes<HTMLDivElement>

export const ModelSelectorLogoGroup = ({
	className,
	...props
}: ModelSelectorLogoGroupProps) => (
	<div
		className={cn(
			"-space-x-1 flex shrink-0 items-center [&>img]:rounded-full [&>img]:bg-background [&>img]:p-px [&>img]:ring-1 dark:[&>img]:bg-foreground",
			className,
		)}
		{...props}
	/>
)

// ── Name ────────────────────────────────────────────────────────────────────

export type ModelSelectorNameProps = HTMLAttributes<HTMLSpanElement>

export const ModelSelectorName = ({ className, ...props }: ModelSelectorNameProps) => (
	<span className={cn("flex-1 truncate text-left", className)} {...props} />
)

// ── Separator ───────────────────────────────────────────────────────────────

export type ModelSelectorSeparatorProps = HTMLAttributes<HTMLDivElement>

export const ModelSelectorSeparator = ({ className, ...props }: ModelSelectorSeparatorProps) => (
	<div className={cn("-mx-1 my-1 h-px bg-border", className)} role="separator" {...props} />
)
