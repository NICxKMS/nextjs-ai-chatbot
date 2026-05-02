"use client"

import type { ComponentProps } from "react"
import { SidebarLeftIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import type { SidebarTrigger } from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-provider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/cn"

export function SidebarToggle({
	className,
	onClick,
	children,
	variant = "outline",
	...props
}: ComponentProps<typeof SidebarTrigger>) {
	const { toggleSidebar } = useSidebar()

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					{...props}
					className={cn(
						"relative h-8 px-2 after:absolute after:-inset-1.5 after:md:hidden md:h-fit md:px-2",
						className,
					)}
					data-testid="sidebar-toggle"
					onClick={(event) => {
						onClick?.(event)
						toggleSidebar()
					}}
					variant={variant}
				>
					{children ?? <SidebarLeftIcon size={16} />}
				</Button>
			</TooltipTrigger>
			<TooltipContent align="start" className="hidden md:block">
				Toggle Sidebar
			</TooltipContent>
		</Tooltip>
	)
}
