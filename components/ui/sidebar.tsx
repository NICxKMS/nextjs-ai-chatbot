"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import { SIDEBAR_WIDTH_MOBILE, SidebarProvider, useSidebar } from "@/components/ui/sidebar-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/cn"

function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	ref,
	...props
}: React.ComponentProps<"div"> & {
	side?: "left" | "right"
	variant?: "sidebar" | "floating" | "inset"
	collapsible?: "offcanvas" | "icon" | "none"
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

	if (collapsible === "none") {
		return (
			<div
				data-slot="sidebar"
				className={cn(
					"flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground",
					className,
				)}
				ref={ref}
				{...props}
			>
				{children}
			</div>
		)
	}

	// On mobile, render the sidebar as an overlay Sheet.
	// The desktop layout uses `hidden md:block`, so it's invisible on
	// mobile and matches the SidebarSkeleton, preventing layout flash.
	if (isMobile) {
		return (
			<Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
				<SheetContent
					className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
					data-mobile="true"
					data-sidebar="sidebar"
					side={side}
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
						} as React.CSSProperties
					}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		)
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-side={side}
			data-state={state}
			data-variant={variant}
			ref={ref}
		>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				className={cn(
					"relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
					"group-data-[collapsible=offcanvas]:w-0",
					"group-data-[side=right]:rotate-180",
					variant === "floating" || variant === "inset"
						? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
						: "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
				)}
			/>
			<div
				className={cn(
					"fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
					side === "left"
						? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
						: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
					// Adjust the padding for floating and inset variants.
					variant === "floating" || variant === "inset"
						? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
						: "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
					className,
				)}
				{...props}
			>
				<div
					className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
					data-sidebar="sidebar"
				>
					{children}
				</div>
			</div>
		</div>
	)
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar()

	return (
		<Button
			data-slot="sidebar-trigger"
			className={cn("h-7 w-7", className)}
			data-sidebar="trigger"
			onClick={(event) => {
				onClick?.(event)
				toggleSidebar()
			}}
			size="icon"
			variant="ghost"
			{...props}
		>
			<PanelLeft />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	)
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn(
				"relative flex w-full flex-1 flex-col bg-background",
				"md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
				className,
			)}
			{...props}
		/>
	)
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	return (
		<Input
			data-slot="sidebar-input"
			className={cn(
				"h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
				className,
			)}
			data-sidebar="input"
			{...props}
		/>
	)
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn("flex flex-col gap-2 p-2", className)}
			data-sidebar="header"
			{...props}
		/>
	)
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn("flex flex-col gap-2 p-2", className)}
			data-sidebar="footer"
			{...props}
		/>
	)
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			className={cn("mx-2 w-auto bg-sidebar-border", className)}
			data-sidebar="separator"
			{...props}
		/>
	)
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				className,
			)}
			data-sidebar="content"
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
			data-sidebar="group"
			{...props}
		/>
	)
}

function SidebarGroupLabel({
	className,
	asChild = false,
	...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "div"

	return (
		<Comp
			data-slot="sidebar-group-label"
			className={cn(
				"flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-sidebar-foreground/70 text-xs outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
				className,
			)}
			data-sidebar="group-label"
			{...props}
		/>
	)
}

function SidebarGroupAction({
	className,
	asChild = false,
	...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "button"

	return (
		<Comp
			data-slot="sidebar-group-action"
			className={cn(
				"absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				// Increases the hit area of the button on mobile.
				"after:-inset-2 after:absolute after:md:hidden",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			data-sidebar="group-action"
			{...props}
		/>
	)
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group-content"
			className={cn("w-full text-sm", className)}
			data-sidebar="group-content"
			{...props}
		/>
	)
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			className={cn("flex w-full min-w-0 flex-col gap-1", className)}
			data-sidebar="menu"
			{...props}
		/>
	)
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			className={cn("group/menu-item relative", className)}
			data-sidebar="menu-item"
			{...props}
		/>
	)
}

const sidebarMenuButtonVariants = cva(
	"peer/menu-button group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				outline:
					"bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
			},
			size: {
				default: "h-8 text-sm",
				sm: "h-7 text-xs",
				lg: "group-data-[collapsible=icon]:!p-0 h-12 text-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

function SidebarMenuButton({
	asChild = false,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	...props
}: React.ComponentProps<"button"> & {
	asChild?: boolean
	isActive?: boolean
	tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
	const Comp = asChild ? Slot : "button"
	const { isMobile, state } = useSidebar()

	const button = (
		<Comp
			data-slot="sidebar-menu-button"
			className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
			data-active={isActive}
			data-sidebar="menu-button"
			data-size={size}
			{...props}
		/>
	)

	if (!tooltip) {
		return button
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		}
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent
				align="center"
				hidden={state !== "collapsed" || isMobile}
				side="right"
				{...tooltip}
			/>
		</Tooltip>
	)
}

function SidebarMenuAction({
	className,
	asChild = false,
	showOnHover = false,
	...props
}: React.ComponentProps<"button"> & {
	asChild?: boolean
	showOnHover?: boolean
}) {
	const Comp = asChild ? Slot : "button"

	return (
		<Comp
			data-slot="sidebar-menu-action"
			className={cn(
				"absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
				// Increases the hit area of the button on mobile.
				"after:-inset-2 after:absolute after:md:hidden",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				showOnHover &&
					"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
				className,
			)}
			data-sidebar="menu-action"
			{...props}
		/>
	)
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-menu-badge"
			className={cn(
				"pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 font-medium text-sidebar-foreground text-xs tabular-nums",
				"peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			data-sidebar="menu-badge"
			{...props}
		/>
	)
}

// Predefined skeleton widths to avoid hydration mismatch from Math.random()
const SKELETON_WIDTHS = ["70%", "55%", "85%", "60%", "75%", "50%", "80%", "65%", "90%", "58%"]

function SidebarMenuSkeleton({
	className,
	showIcon = false,
	index = 0,
	...props
}: React.ComponentProps<"div"> & {
	showIcon?: boolean
	index?: number
}) {
	// Deterministic width based on index to avoid hydration mismatch
	const width = SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]

	return (
		<div
			data-slot="sidebar-menu-skeleton"
			className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
			data-sidebar="menu-skeleton"
			{...props}
		>
			{showIcon && (
				<Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
			)}
			<Skeleton
				className="h-4 max-w-[var(--skeleton-width)] flex-1"
				data-sidebar="menu-skeleton-text"
				style={
					{
						"--skeleton-width": width,
					} as React.CSSProperties
				}
			/>
		</div>
	)
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu-sub"
			className={cn(
				"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-2.5 py-0.5",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			data-sidebar="menu-sub"
			{...props}
		/>
	)
}

function SidebarMenuSubItem(props: React.ComponentProps<"li">) {
	return <li data-slot="sidebar-menu-sub-item" {...props} />
}

function SidebarMenuSubButton({
	asChild = false,
	size = "md",
	isActive,
	className,
	...props
}: React.ComponentProps<"a"> & {
	asChild?: boolean
	size?: "sm" | "md"
	isActive?: boolean
}) {
	const Comp = asChild ? Slot : "a"

	return (
		<Comp
			data-slot="sidebar-menu-sub-button"
			className={cn(
				"-translate-x-px flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
				"data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
				size === "sm" && "text-xs",
				size === "md" && "text-sm",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			data-active={isActive}
			data-sidebar="menu-sub-button"
			data-size={size}
			{...props}
		/>
	)
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
}
